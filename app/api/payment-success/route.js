import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/contracts';

// 1 USD = 1 EscroToken (hackathon simulation)
// 83 INR = 1 USD (fixed rate)
const INR_TO_USD_RATE = 83;

function verifyRazorpaySignature(orderId, paymentId, signature) {
    const body = `${orderId}|${paymentId}`;
    const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');
    return expected === signature;
}

function generateTxHash(data) {
    const str = JSON.stringify(data) + Date.now() + Math.random();
    return crypto.createHash('sha256').update(str).digest('hex').slice(0, 64);
}

export async function POST(req) {
    try {
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            formData,
            amount_inr, // in paise
        } = await req.json();

        // ── 1. Verify Razorpay HMAC signature ────────────────────────
        const isValid = verifyRazorpaySignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValid) {
            return NextResponse.json(
                { error: 'Payment verification failed. Invalid signature.' },
                { status: 400 }
            );
        }

        // ── 2. Calculate escrow token amount ─────────────────────────
        const amount_inr_rupees = amount_inr / 100; // paise → rupees
        const amount_usd = amount_inr_rupees / INR_TO_USD_RATE;
        const escrow_token_amount = Math.round(amount_usd);
        const totalValue = formData.milestones.reduce(
            (s, m) => s + (parseFloat(m.amount) || 0), 0
        );

        // ── 3. Simulate on-chain project creation (non-fatal) ────────
        let onChainProjectId = 0;
        let txHash = null;

        try {
            const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
            const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;

            if (deployerKey && deployerKey.startsWith('0x')) {
                const wallet = new ethers.Wallet(deployerKey, provider);
                const escrowContract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet);

                const msTitles = formData.milestones.map(m => m.title || 'Untitled Milestone');
                const msAmountsUSD = formData.milestones.map(m =>
                    BigInt(Math.round(parseFloat(m.amount) * 100))
                );
                const freelancerWallet = formData.freelancerWallet || (await wallet.getAddress());

                // Convert USD value → ETH at $2500/ETH with 0.5% margin
                const ethAmount = (totalValue / 2500) * 1.005;
                const valueWei = ethers.parseEther(ethAmount.toFixed(18));

                const tx = await escrowContract.createProject(
                    freelancerWallet,
                    msTitles,
                    msAmountsUSD,
                    { value: valueWei }
                );
                const receipt = await tx.wait();
                txHash = receipt.hash;

                const iface = new ethers.Interface(ESCROW_ABI);
                for (const log of receipt.logs) {
                    try {
                        const parsed = iface.parseLog(log);
                        if (parsed?.name === 'ProjectCreated') {
                            onChainProjectId = Number(parsed.args.projectId);
                            break;
                        }
                    } catch { }
                }
            }
        } catch (chainErr) {
            // Non-fatal for hackathon — proceed without on-chain tx
            console.warn('[payment-success] On-chain step failed:', chainErr.message);
            txHash = generateTxHash({ razorpay_payment_id, formData }); // simulated hash
        }

        // ── 4. Save contract to Firestore (mirroring createContract in firestore.js) ──
        const contractData = {
            clientUid: formData.clientUid,
            clientName: formData.clientName || '',
            clientEmail: formData.clientEmail || '',
            clientCountry: formData.clientCountry || '',
            freelancerName: formData.freelancerName || '',
            freelancerEmail: formData.freelancerEmail || '',
            freelancerCountry: formData.freelancerCountry || '',
            freelancerWallet: formData.freelancerWallet || '',
            title: formData.title || '',
            totalValue,
            currency: formData.currency || 'USD',
            deadline: formData.deadline || '',
            txHash,
            onChain: !!onChainProjectId,
            onChainId: onChainProjectId,
            paymentMethod: 'razorpay',
            razorpayPaymentId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            escrowTokenAmount: escrow_token_amount,
            amountInrPaise: amount_inr,
            status: 'Verification', // Matches statusFlow: fiat is pre-funded from the start
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const contractRef = await addDoc(collection(db, 'contracts'), contractData);
        const contractId = contractRef.id;

        // ── 5. Create milestone subcollection (matches existing data model) ──
        for (let i = 0; i < formData.milestones.length; i++) {
            const m = formData.milestones[i];
            await addDoc(collection(db, 'contracts', contractId, 'milestones'), {
                title: m.title || `Milestone ${i + 1}`,
                amount: parseFloat(m.amount) || 0,
                order: i,
                status: 'Pending',
                evidenceUrl: null,
                createdAt: serverTimestamp(),
            });
        }

        // ── 6. Create initial audit log entry (subcollection) ────────
        const auditData = {
            action: `Fiat payment received via Razorpay. ₹${amount_inr_rupees.toLocaleString('en-IN')} (${escrow_token_amount} EscroTokens locked).`,
            actor: `${formData.clientName || 'Client'} (Client)`,
            icon: 'shield',
            timestamp: serverTimestamp(),
        };
        auditData.txHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(auditData) + Math.random())
            .digest('hex')
            .slice(0, 32);
        await addDoc(collection(db, 'contracts', contractId, 'auditLog'), auditData);

        // ── 7. Save payment record ────────────────────────────────────
        await addDoc(collection(db, 'payments'), {
            payment_id: razorpay_payment_id,
            project_id: contractId,
            razorpay_order_id,
            amount_inr,
            escrow_token_amount,
            status: 'verified',
            createdAt: serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            contractId,
            onChainId: onChainProjectId,
            escrowTokenAmount: escrow_token_amount,
        });

    } catch (err) {
        console.error('[payment-success] Error:', err);
        return NextResponse.json(
            { error: err.message || 'Payment processing failed' },
            { status: 500 }
        );
    }
}
