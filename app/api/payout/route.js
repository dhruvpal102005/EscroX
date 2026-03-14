import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/payout
 * Simulates a Razorpay Payout (hackathon prototype).
 * In production, this would use the Razorpay Payouts API with fund account IDs.
 * Here we validate the request and return a simulated payout confirmation.
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { contractId, freelancerName, amount, currency, paymentMethod, payoutTo, upiId, accountNumber, ifsc } = body;

        if (!contractId || !amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid payout request' }, { status: 400 });
        }

        // Simulate a payout reference ID
        const payoutRef = `PAYOUT_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
        const ts = new Date().toISOString();

        // In production: call Razorpay Payouts API here
        // For hackathon: return a simulated success response
        const result = {
            success: true,
            payoutRef,
            freelancerName,
            amount,
            currency: currency || 'INR',
            paymentMethod,
            payoutTo: payoutTo || 'bank',
            upiId: upiId || null,
            accountNumber: accountNumber ? `****${accountNumber.slice(-4)}` : null,
            initiatedAt: ts,
            estimatedArrival: payoutTo === 'upi' ? 'Instant' : '1-2 business days',
            message: payoutTo === 'upi'
                ? `₹${amount.toLocaleString('en-IN')} sent instantly to ${upiId}`
                : `₹${amount.toLocaleString('en-IN')} will arrive in your bank account within 1-2 business days.`,
        };

        return NextResponse.json(result);
    } catch (err) {
        console.error('Payout error:', err);
        return NextResponse.json({ error: err.message || 'Payout failed' }, { status: 500 });
    }
}
