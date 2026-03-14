import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
    try {
        const { to, subject, type, data } = await req.json();

        if (!to) return NextResponse.json({ error: 'Missing recipient' }, { status: 400 });

        let html = '';
        let attachments = [];

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
                    <p>I've attached a PDF copy of the contract details to this email for your reference.</p>
                    <p>Please review and accept the terms to get started.</p>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/contract/${data.id}" style="${buttonStyle}">View Contract Online</a>
                    <p style="margin-top: 40px; font-size: 12px; color: #94a3b8;">Sent via EscroX — Secured on-chain escrow payments.</p>
                </div>
            `;

            // Generate PDF for new contracts
            const doc = new jsPDF();
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(245, 166, 35); // EscroX Orange
            doc.text("EscroX Contract Summary", 20, 30);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 38);
            
            doc.setDrawColor(245, 166, 35);
            doc.line(20, 42, 190, 42);

            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42); // Slate 900
            doc.text("Project Information", 20, 55);
            
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.text(`Title: ${data.title}`, 20, 65);
            doc.text(`Contract ID: ${data.id}`, 20, 72);
            doc.text(`Total Value: $${data.amount}`, 20, 79);
            doc.text(`Client: ${data.clientName}`, 20, 86);
            doc.text(`Freelancer: ${data.freelancerName}`, 20, 93);

            doc.setFont("helvetica", "bold");
            doc.text("Proposed Milestones", 20, 110);
            
            let yPos = 120;
            const milestones = data.milestones || [];
            
            // Table Header
            doc.setFillColor(248, 250, 252);
            doc.rect(20, yPos - 5, 170, 8, "F");
            doc.setFontSize(9);
            doc.text("Milestone Title", 25, yPos);
            doc.text("Amount ($)", 160, yPos);
            
            yPos += 10;
            doc.setFont("helvetica", "normal");
            milestones.forEach((m, i) => {
                doc.text(`${i + 1}. ${m.title}`, 25, yPos);
                doc.text(`$${m.amount}`, 160, yPos);
                yPos += 8;
            });

            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text("EscroX ensures funds are held in a secure vault and released only upon your approval.", 20, 270);
            doc.text("This document is a summary and not a legal contract by itself.", 20, 275);

            const pdfArrayBuffer = doc.output('arraybuffer');
            attachments.push({
                content: Buffer.from(pdfArrayBuffer),
                filename: `Contract_${data.id.slice(0,8)}.pdf`,
            });

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
            from: 'onboarding@resend.dev', 
            to: [to],
            subject: subject,
            html: html,
            attachments: attachments,
        });

        if (error) {
            console.error('Resend API Error:', error);
            return NextResponse.json({ error }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: emailData.id });
    } catch (err) {
        console.error('API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

