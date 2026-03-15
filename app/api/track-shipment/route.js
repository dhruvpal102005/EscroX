import { NextResponse } from 'next/server';

// ── Supported Couriers ────────────────────────────────────────────────────────
// TrackingMore slug → display name mapping
export const COURIERS = [
    { slug: 'ekart',        label: 'Ekart',         flag: '🇮🇳' },
    { slug: 'india-post',   label: 'India Post',    flag: '🇮🇳' },
    { slug: 'delhivery',    label: 'Delhivery',     flag: '🇮🇳' },
    { slug: 'bluedart',     label: 'BlueDart',      flag: '🇮🇳' },
    { slug: 'dtdc',         label: 'DTDC',          flag: '🇮🇳' },
    { slug: 'xpressbees',   label: 'XpressBees',    flag: '🇮🇳' },
    { slug: 'dhl',          label: 'DHL Express',   flag: '🌍' },
    { slug: 'fedex',        label: 'FedEx',         flag: '🌍' },
    { slug: 'ups',          label: 'UPS',           flag: '🌍' },
    { slug: 'aramex',       label: 'Aramex',        flag: '🌍' },
];

// ── Simulated fallback data ───────────────────────────────────────────────────
// Used when TRACKINGMORE_API_KEY is not set (development / demo mode)
function simulateTracking(trackingId, courierSlug) {
    const charSum = trackingId.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    const stages = [
        { status: 'Order Placed',      tag: 'InfoReceived',   location: 'Seller Warehouse' },
        { status: 'Picked Up',         tag: 'PickedUp',       location: 'Local Facility'   },
        { status: 'In Transit',        tag: 'InTransit',      location: 'Sorting Hub'      },
        { status: 'Out for Delivery',  tag: 'OutForDelivery', location: 'Delivery Zone'    },
        { status: 'Delivered',         tag: 'Delivered',      location: 'Destination'      },
    ];

    const stageIdx = charSum % stages.length;
    const currentStage = stages[stageIdx];

    const today = new Date();
    const events = stages.slice(0, stageIdx + 1).map((s, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (stageIdx - i));
        return {
            date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            status: s.status,
            location: s.location,
            description: s.status,
        };
    }).reverse();

    const estDelivery = new Date(today);
    estDelivery.setDate(today.getDate() + Math.max(0, 4 - stageIdx));

    return {
        trackingId,
        courier: courierSlug,
        status: currentStage.status,
        statusTag: currentStage.tag,
        location: currentStage.location,
        estimatedDelivery: estDelivery.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        events,
        isSimulated: true,
    };
}

// ── Normalize TrackingMore v4 response ────────────────────────────────────────
function normalizeTrackingMore(data, trackingId, courierSlug) {
    // v4 API uses `delivery_status` (not `tag`) for the top-level status string
    const statusMap = {
        'InfoReceived':       'Order Placed',
        'InTransit':          'In Transit',
        'PickedUp':           'Picked Up',
        'OutForDelivery':     'Out for Delivery',
        'Delivered':          'Delivered',
        'Exception':          'Exception / Delayed',
        'Expired':            'Expired',
        'NotFound':           'Not Found',
        'Pending':            'Pending',
        'undelivered':        'Undelivered',
        'availableForPickup': 'Available for Pickup',
    };

    const tag    = data.delivery_status || data.tag || 'InTransit';
    const status = statusMap[tag] || tag;

    // v4 checkpoint events: each item has checkpoint_date, checkpoint_delivery_status, location, checkpoint_remark
    const rawEvents = data.origin_info?.trackinfo || data.destination_info?.trackinfo || [];
    const events = rawEvents.map(e => ({
        date: e.checkpoint_date
            ? new Date(e.checkpoint_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
            : '',
        status:      e.checkpoint_delivery_status || '',
        location:    e.location || '',
        description: e.checkpoint_remark || e.checkpoint_delivery_status || '',
    }));

    // v4: ETA field is `estimated_delivery_time`
    const eta = data.estimated_delivery_time || data.expected_delivery;

    return {
        trackingId,
        courier: courierSlug,
        status,
        statusTag: tag,
        location: rawEvents[0]?.location || '',
        estimatedDelivery: eta
            ? new Date(eta).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'N/A',
        events,
        isSimulated: false,
    };
}

// ── Route Handler ─────────────────────────────────────────────────────────────
export async function POST(req) {
    try {
        const { trackingId, courier } = await req.json();

        if (!trackingId || !courier) {
            return NextResponse.json({ error: 'trackingId and courier are required' }, { status: 400 });
        }

        const apiKey = process.env.TRACKINGMORE_API_KEY;

        if (!apiKey) {
            console.warn('[track-shipment] TRACKINGMORE_API_KEY not set — using simulated data');
            return NextResponse.json(simulateTracking(trackingId, courier));
        }

        // ── Step 1: Register the tracking number (idempotent) ─────────────────
        const createRes = await fetch('https://api.trackingmore.com/v4/trackings/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Tracking-Api-Key': apiKey,
            },
            body: JSON.stringify({ tracking_number: trackingId, courier_code: courier }),
        });
        const createData = await createRes.json();
        console.log('[TrackingMore] create:', createData.meta?.code, createData.meta?.message);

        // meta.code 200 = created, 4010/4101 = already exists/being tracked — all fine
        const ALLOWED_CREATE_CODES = [200, 4010, 4101];
        if (!ALLOWED_CREATE_CODES.includes(createData.meta?.code)) {
            console.error('[TrackingMore] create error:', JSON.stringify(createData));
            return NextResponse.json(simulateTracking(trackingId, courier));
        }

        // ── Step 2: Fetch tracking events ────────────────────────────────────
        const getUrl = `https://api.trackingmore.com/v4/trackings/get?tracking_numbers=${encodeURIComponent(trackingId)}&courier_code=${encodeURIComponent(courier)}`;
        const getRes  = await fetch(getUrl, {
            method: 'GET',
            headers: { 'Tracking-Api-Key': apiKey },
        });
        const getData = await getRes.json();
        console.log('[TrackingMore] get:', getData.meta?.code, 'items:', getData.data?.length);

        if (getData.meta?.code !== 200 || !getData.data?.length) {
            console.warn('[TrackingMore] no data — falling back to simulation');
            return NextResponse.json(simulateTracking(trackingId, courier));
        }

        return NextResponse.json(normalizeTrackingMore(getData.data[0], trackingId, courier));

    } catch (err) {
        console.error('[track-shipment] Unexpected error:', err);
        return NextResponse.json({ error: 'Failed to fetch tracking data' }, { status: 500 });
    }
}
