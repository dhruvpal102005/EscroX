'use client';

import React from 'react';
import {
    getDefaultConfig,
    RainbowKitProvider,
    lightTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    sepolia,
    hardhat,
} from 'wagmi/chains';
import {
    QueryClientProvider,
    QueryClient,
} from "@tanstack/react-query";

import '@rainbow-me/rainbowkit/styles.css';

// Using a public demo Project ID for now to prevent 403 errors. 
// User MUST replace this with their own from https://cloud.walletconnect.com for production.
const projectId = 'c652d0148879353d7e965d7f6f361ea5';

export function Web3Provider({ children }) {
    // Only init the config once per client session to prevent "Init called 4 times"
    const [config] = React.useState(() => getDefaultConfig({
        appName: 'EscrowX',
        projectId: projectId,
        chains: [hardhat, sepolia],
        ssr: true,
    }));

    const [queryClient] = React.useState(() => new QueryClient());

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={lightTheme({
                        accentColor: '#f5a623',
                        accentColorForeground: 'white',
                        borderRadius: 'large',
                    })}
                >
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
