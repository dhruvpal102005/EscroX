import { NextResponse } from 'next/server';
import { validateApiKey, apiError } from '@/lib/api-auth';
import { createContract } from '@/lib/firestore';

/**
 * POST /api/v1/escrow/create
 * Programmatically initialize an escrow contract.
 * Headers: x-api-key
 */
export async function POST(req) {
    try {
        if (!validateApiKey(req)) {
            return apiError('Unauthorized: Invalid API Key', 401);
        }

        const body = await req.json();
        const {
            clientData, freelancerData, contractData,
            paymentMethod = 'wallet', onChain = false
        } = body;

        // Basic validation
        if (!clientData?.email || !freelancerData?.email || !contractData?.title || !contractData?.totalValue) {
            return apiError('Missing required fields: clientData, freelancerData, or contractData');
        }

        // Map API payload to Firestore payload
        const payload = {
            clientUid: clientData.uid || 'external-platform',
            clientName: clientData.name,
            clientEmail: clientData.email,
            clientCountry: clientData.country || 'Global',
            freelancerName: freelancerData.name,
            freelancerEmail: freelancerData.email,
            freelancerCountry: freelancerData.country || 'Global',
            freelancerWallet: freelancerData.wallet || '',
            title: contractData.title,
            totalValue: contractData.totalValue,
            currency: contractData.currency || 'USD',
            deadline: contractData.deadline || '',
            milestones: contractData.milestones || [],
            paymentMethod,
            onChain: !!onChain,
            status: 'Agreement' // Start in Agreement phase
        };

        const contractId = await createContract(payload);

        return NextResponse.json({
            success: true,
            contractId,
            status: 'Agreement',
            url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://escrox.vercel.app'}/contract/${contractId}`,
            message: 'Escrow contract initialized successfully.'
        });

    } catch (err) {
        console.error('API Creation Error:', err);
        return apiError(err.message || 'Internal Server Error', 500);
    }
}
