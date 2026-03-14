'use client';

import React from 'react';
import {
    RainbowKitProvider,
    lightTheme,
    connectorsForWallets,
} from '@rainbow-me/rainbowkit';
import { metaMaskWallet, injectedWallet } from '@rainbow-me/rainbowkit/wallets';
import { WagmiProvider, createConfig, http } from 'wagmi';
import {
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    sepolia,
    localhost,
} from 'wagmi/chains';
import {
    QueryClientProvider,
    QueryClient,
} from "@tanstack/react-query";

import '@rainbow-me/rainbowkit/styles.css';

const projectId = 'demo'; // bypassed by manual connectors

const connectors = connectorsForWallets(
    [
        {
            groupName: 'Recommended',
            wallets: [metaMaskWallet, injectedWallet],
        },
    ],
    {
        appName: 'EscrowX',
        projectId: projectId,
    }
);

export function Web3Provider({ children }) {
    const [config] = React.useState(() => createConfig({
        connectors,
        chains: [localhost, sepolia],
        transports: {
            [localhost.id]: http('http://127.0.0.1:8545'),
            [sepolia.id]: http(),
        },
        ssr: true,
    }));

    const [queryClient] = React.useState(() => new QueryClient());

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={lightTheme({
                        accentColor: '#ffb43b',
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
