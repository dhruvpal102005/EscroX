import { NextResponse } from 'next/server';
import { validateApiKey, apiError } from '@/lib/api-auth';
import { getContract } from '@/lib/firestore';

/**
 * GET /api/v1/escrow/status/[id]
 * Retrieve the current status of an escrow contract.
 */
export async function GET(req, { params }) {
    try {
        const { id } = params;

        if (!validateApiKey(req)) {
            return apiError('Unauthorized: Invalid API Key', 401);
        }

        const contract = await getContract(id);
        if (!contract) {
            return apiError('Contract not found', 404);
        }

        return NextResponse.json({
            success: true,
            data: {
                id: contract.id,
                title: contract.title,
                status: contract.status,
                totalValue: contract.totalValue,
                currency: contract.currency,
                milestones: contract.milestones.map(m => ({
                    id: m.id,
                    title: m.title,
                    status: m.status,
                    amount: m.amount
                })),
                auditLogCount: contract.auditLog?.length || 0,
                updatedAt: contract.updatedAt
            }
        });

    } catch (err) {
        console.error('API Status Error:', err);
        return apiError(err.message || 'Internal Server Error', 500);
    }
}
