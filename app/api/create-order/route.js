import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(req) {
    try {
        const { amount_inr } = await req.json();

        if (!amount_inr || amount_inr < 100) {
            return NextResponse.json({ error: 'Invalid amount. Minimum is ₹1.' }, { status: 400 });
        }

        const order = await razorpay.orders.create({
            amount: Math.round(amount_inr), // amount in paise
            currency: 'INR',
            receipt: `escrowx_${Date.now()}`,
            notes: {
                platform: 'EscroX',
                type: 'escrow_deposit',
            },
        });

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (err) {
        console.error('[create-order] Error:', err);
        return NextResponse.json({ error: err.message || 'Failed to create Razorpay order' }, { status: 500 });
    }
}
