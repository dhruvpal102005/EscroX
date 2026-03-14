import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Web3Provider } from '@/context/Web3Provider';
import { Toaster } from 'react-hot-toast';

export const metadata = {
    title: 'EscrowX — Programmable Cross-Border Escrow',
    description: 'Autonomous escrow engine for global freelance collaborations. Secure, milestone-based, and integration-ready.',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />
                <Web3Provider>
                    <AuthProvider>
                        {children}
                    </AuthProvider>
                </Web3Provider>
            </body>
        </html>
    );
}
