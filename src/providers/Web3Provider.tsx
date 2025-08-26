'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { base, mainnet } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { RainbowKitProvider, getDefaultWallets, connectorsForWallets } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

// Configure chains and providers
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [base, mainnet],
  [
    alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '' }),
    publicProvider(),
  ]
);

// Configure wallets
const { wallets } = getDefaultWallets({
  appName: 'Stumble Higher',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
  chains,
});

const connectors = connectorsForWallets([
  ...wallets,
]);

// Create wagmi config
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

// Web3 Context for custom functionality
interface Web3ContextType {
  // Contract interactions
  submitPayment: (amount: number) => Promise<{ txHash?: string; error?: string }>;
  checkBalance: (address: string) => Promise<{ balance: string; error?: string }>;

  // Transaction helpers
  waitForTransaction: (hash: string) => Promise<{ success: boolean; error?: string }>;

  // Contract addresses
  contracts: {
    higherToken: string;
    submissionContract: string;
  };

  // Network info
  supportedChains: typeof chains;
  isCorrectNetwork: boolean;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);

  const contracts = {
    higherToken: process.env.NEXT_PUBLIC_HIGHER_TOKEN_ADDRESS || '0x0578d8a44db98b23bf096a382e016e29a5ce0ffe',
    submissionContract: process.env.NEXT_PUBLIC_SUBMISSION_CONTRACT_ADDRESS || '',
  };

  // Submit payment for content submission
  const submitPayment = async (amount: number = 1000): Promise<{ txHash?: string; error?: string }> => {
    try {
      // This would interact with the submission contract
      // For now, return a mock transaction hash

      // In production:
      // 1. Check user has enough HIGHER tokens
      // 2. Approve spending if needed
      // 3. Call contract's payForSubmission function
      // 4. Return transaction hash

      return {
        txHash: '0x' + Math.random().toString(16).substring(2, 66),
      };
    } catch (error) {
      console.error('Payment error:', error);
      return {
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  };

  // Check HIGHER token balance
  const checkBalance = async (address: string): Promise<{ balance: string; error?: string }> => {
    try {
      // This would query the HIGHER token contract
      // For now, return a mock balance

      return {
        balance: '5000', // Mock balance
      };
    } catch (error) {
      console.error('Balance check error:', error);
      return {
        balance: '0',
        error: error instanceof Error ? error.message : 'Balance check failed',
      };
    }
  };

  // Wait for transaction confirmation
  const waitForTransaction = async (hash: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // This would wait for transaction confirmation
      // For now, simulate a successful transaction

      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate wait

      return { success: true };
    } catch (error) {
      console.error('Transaction wait error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed',
      };
    }
  };

  const value: Web3ContextType = {
    submitPayment,
    checkBalance,
    waitForTransaction,
    contracts,
    supportedChains: chains,
    isCorrectNetwork,
  };

  const rainbowKitTheme = {
    blurs: {
      modalOverlay: 'blur(4px)',
    },
    colors: {
      accentColor: '#FF6D0E',
      accentColorForeground: '#ffffff',
      actionButtonBorder: '#27272a',
      actionButtonBorderMobile: '#27272a',
      actionButtonSecondaryBackground: '#27272a',
      closeButton: '#a1a1aa',
      closeButtonBackground: '#27272a',
      connectButtonBackground: '#18181b',
      connectButtonBackgroundError: '#ef4444',
      connectButtonInnerBackground: '#27272a',
      connectButtonText: '#ffffff',
      connectButtonTextError: '#ffffff',
      connectionIndicator: '#10b981',
      downloadBottomCardBackground: '#18181b',
      downloadTopCardBackground: '#09090b',
      error: '#ef4444',
      generalBorder: '#27272a',
      generalBorderDim: '#18181b',
      menuItemBackground: '#27272a',
      modalBackdrop: 'rgba(0, 0, 0, 0.8)',
      modalBackground: '#18181b',
      modalBorder: '#27272a',
      modalText: '#ffffff',
      modalTextDim: '#a1a1aa',
      modalTextSecondary: '#71717a',
      profileAction: '#27272a',
      profileActionHover: '#3f3f46',
      profileForeground: '#18181b',
      selectedOptionBorder: '#FF6D0E',
      standby: '#71717a',
    },
    fonts: {
      body: 'Inter, system-ui, sans-serif',
    },
    radii: {
      actionButton: '8px',
      connectButton: '8px',
      menuButton: '8px',
      modal: '12px',
      modalMobile: '12px',
    },
    shadows: {
      connectButton: '0 4px 12px rgba(0, 0, 0, 0.1)',
      dialog: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      profileDetailsAction: '0 4px 12px rgba(0, 0, 0, 0.1)',
      selectedOption: '0 0 0 2px rgba(255, 109, 14, 0.2)',
      selectedWallet: '0 0 0 2px rgba(255, 109, 14, 0.2)',
      walletLogo: '0 4px 12px rgba(0, 0, 0, 0.1)',
    },
  };

  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider
        chains={chains}
        theme={rainbowKitTheme}
        appInfo={{
          appName: 'Stumble Higher',
          learnMoreUrl: 'https://stumblehigher.press',
        }}
        showRecentTransactions={true}
      >
        <Web3Context.Provider value={value}>
          {children}
        </Web3Context.Provider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}

// Additional hooks for wallet functionality
export function useWallet() {
  // This would use wagmi hooks for wallet connection
  // For now, return mock data
  return {
    address: null,
    isConnected: false,
    isConnecting: false,
    connect: () => {},
    disconnect: () => {},
    chain: chains[0],
    switchNetwork: () => {},
  };
}

export function useHigherBalance() {
  const { checkBalance } = useWeb3();
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);

  const fetchBalance = async (address: string) => {
    setLoading(true);
    const result = await checkBalance(address);
    setBalance(result.balance);
    setLoading(false);
  };

  return {
    balance,
    loading,
    fetchBalance,
  };
}

export function useSubmissionPayment() {
  const { submitPayment, waitForTransaction } = useWeb3();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const payForSubmission = async (amount: number = 1000) => {
    setIsSubmitting(true);
    setTxHash(null);

    try {
      const result = await submitPayment(amount);

      if (result.error) {
        throw new Error(result.error);
      }

      setTxHash(result.txHash!);

      // Wait for confirmation
      const confirmResult = await waitForTransaction(result.txHash!);

      if (!confirmResult.success) {
        throw new Error(confirmResult.error || 'Transaction failed');
      }

      return { success: true, txHash: result.txHash };
    } catch (error) {
      console.error('Submission payment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed'
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    payForSubmission,
    isSubmitting,
    txHash,
  };
}
