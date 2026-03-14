import './globals.css';

export const metadata = {
    title: 'EscrowX — Programmable Cross-Border Escrow',
    description: 'Autonomous escrow engine for global freelance collaborations. Secure, milestone-based, and integration-ready.',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
