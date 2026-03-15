import { NextResponse } from 'next/server';
import { validateApiKey, apiError } from '@/lib/api-auth';
import { approveMilestone } from '@/lib/firestore';

/**
 * POST /api/v1/escrow/approve
 * Release funds for a milestone programmatically.
 */
export async function POST(req) {
    try {
        if (!validateApiKey(req)) {
            return apiError('Unauthorized: Invalid API Key', 401);
        }

        const body = await req.json();
        const { contractId, milestoneId, amount, title, approverName, txHash } = body;

        if (!contractId || !milestoneId) {
            return apiError('Missing required fields: contractId and milestoneId');
        }

        await approveMilestone(
            contractId,
            milestoneId,
            amount || 0,
            title || 'External API Release',
            approverName || 'External Platform',
            txHash || null
        );

        return NextResponse.json({
            success: true,
            message: `Milestone ${milestoneId} approved and funds released.`
        });

    } catch (err) {
        console.error('API Approval Error:', err);
        return apiError(err.message || 'Internal Server Error', 500);
    }
}
