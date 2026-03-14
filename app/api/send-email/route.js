import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
    try {
        const { to, subject, type, data } = await req.json();

        if (!to) return NextResponse.json({ error: 'Missing recipient' }, { status: 400 });

        let html = '';

        // Base styling for emails
        const style = `
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #334155;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        `;
        const buttonStyle = `
            display: inline-block;
            background-color: #f5a623;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin-top: 20px;
        `;

        if (type === 'new_contract') {
            html = `
                <div style="${style}">
                    <h1 style="color: #0f172a;">You've been invited to a new project! 🚀</h1>
                    <p>Hi ${data.freelancerName || 'there'},</p>
                    <p><strong>${data.clientName}</strong> has created a new escrow contract for you: <strong>${data.title}</strong>.</p>
                    <p>Total Value: <strong>$${data.amount}</strong></p>
                    <p>Please review and accept the terms to get started.</p>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/contract/${data.id}" style="${buttonStyle}">View Contract</a>
                    <p style="margin-top: 40px; font-size: 12px; color: #94a3b8;">Sent via EscroX — Secured on-chain escrow payments.</p>
                </div>
            `;
        } else if (type === 'milestone_submitted') {
            html = `
                <div style="${style}">
                    <h1 style="color: #0f172a;">Milestone Ready for Review 📬</h1>
                    <p>Hi ${data.clientName},</p>
                    <p>The freelancer has submitted <strong>Milestone ${data.order + 1}: ${data.title}</strong> for review.</p>
                    <p>Please review the work and evidence on the dashboard to release the funds.</p>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/contract/${data.id}" style="${buttonStyle}">Review Milestone</a>
                </div>
            `;
        } else if (type === 'milestone_approved') {
            html = `
                <div style="${style}">
                    <h1 style="color: #10b981;">Funds Released! 🎉</h1>
                    <p>Hi ${data.freelancerName},</p>
                    <p>Great news! <strong>${data.clientName}</strong> has approved your milestone: <strong>${data.title}</strong>.</p>
                    <p>The payment of <strong>$${data.amount}</strong> has been released to your wallet.</p>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/contract/${data.id}" style="${buttonStyle}">View Contract</a>
                </div>
            `;
        } else if (type === 'milestone_rejected') {
            html = `
                <div style="${style}">
                    <h1 style="color: #e11d48;">Milestone Needs Revision ⚠️</h1>
                    <p>Hi ${data.freelancerName},</p>
                    <p><strong>${data.clientName}</strong> has requested revisions for milestone: <strong>${data.title}</strong>.</p>
                    <p>Please check the comments and resubmit the work.</p>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/contract/${data.id}" style="${buttonStyle}">View Revisions</a>
                </div>
            `;
        } else if (type === 'contract_accepted') {
            html = `
                <div style="${style}">
                    <h1 style="color: #10b981;">Contract Accepted! ✅</h1>
                    <p>Hi ${data.clientName},</p>
                    <p>The freelancer has accepted your contract offer: <strong>${data.title}</strong>.</p>
                    <p>The project is now active!</p>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/contract/${data.id}" style="${buttonStyle}">View Dashboard</a>
                </div>
            `;
        }

        const { data: emailData, error } = await resend.emails.send({
            from: 'EscroX <notifications@resend.dev>', // Use onboarding domain for testing
            to: [to],
            subject: subject,
            html: html,
        });

        if (error) {
            console.error('Resend Error:', error);
            return NextResponse.json({ error }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: emailData.id });
    } catch (err) {
        console.error('API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
