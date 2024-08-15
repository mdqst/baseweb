'use client';
import '@rainbow-me/rainbowkit/styles.css';

import {
  Provider as CookieManagerProvider,
  Region,
  TrackingCategory,
  TrackingPreference,
} from '@coinbase/cookie-manager';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { Provider as TooltipProvider } from '@radix-ui/react-tooltip';
import { connectorsForWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import {
  coinbaseWallet,
  metaMaskWallet,
  rainbowWallet,
  uniswapWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExperimentsProvider from 'base-ui/contexts/Experiments';
import useSprig from 'base-ui/hooks/useSprig';
import { MotionConfig } from 'framer-motion';
import { useCallback, useRef } from 'react';
import { createConfig, http, WagmiProvider } from 'wagmi';
import { base, baseSepolia, mainnet } from 'wagmi/chains';
import { cookieManagerConfig } from '../src/utils/cookieManagerConfig';
import ClientAnalyticsScript from 'apps/web/src/components/ClientAnalyticsScript/ClientAnalyticsScript';
import dynamic from 'next/dynamic';
import ErrorsProvider from 'apps/web/contexts/Errors';
import { isDevelopment } from 'apps/web/src/constants';

const DynamicCookieBannerWrapper = dynamic(
  () => import('apps/web/src/components/CookieBannerWrapper'),
  { ssr: false }
);

coinbaseWallet.preference = 'all';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [coinbaseWallet, metaMaskWallet, uniswapWallet, rainbowWallet, walletConnectWallet],
    },
  ],
  {
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'dummy-id',
    walletConnectParameters: {},
    appName: 'Base.org',
    appDescription: '',
    appUrl: 'https://www.base.org/',
    appIcon: '',
  }
);

const config = createConfig({
  connectors,
  chains: [base, baseSepolia, mainnet],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [mainnet.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();
const sprigEnvironmentId = process.env.NEXT_PUBLIC_SPRIG_ENVIRONMENT_ID;

type AppProvidersProps = {
  children: React.ReactNode;
};

export default function AppProviders({ children }: AppProvidersProps) {
  const trackingPreference = useRef<TrackingPreference>();

  const setTrackingPreference = useCallback((newPreference: TrackingPreference) => {
    const priorConsent = trackingPreference.current?.consent;
    trackingPreference.current = newPreference;

    if (!priorConsent) return;

    const newConsent = newPreference.consent;

    const preferencesChanged = priorConsent.some(
      (elem: TrackingCategory) => !newConsent.includes(elem)
    ) || newConsent.some((elem: TrackingCategory) => !priorConsent.includes(elem));

    if (preferencesChanged) window.location.reload();
  }, []);

  const handleLogError = useCallback((err: Error) => console.error(err), []);

  useSprig(sprigEnvironmentId);

  return (
    <ErrorsProvider context="web">
      <CookieManagerProvider
        projectName="base_web"
        locale="en"
        region={Region.DEFAULT}
        log={console.log}
        onError={handleLogError}
        onPreferenceChange={setTrackingPreference}
        config={cookieManagerConfig}
      >
        <MotionConfig reducedMotion="user">
          <ClientAnalyticsScript />
          <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
              <OnchainKitProvider
                chain={isDevelopment ? baseSepolia : base}
                apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
              >
                <RainbowKitProvider modalSize="compact">
                  <TooltipProvider>
                    <ExperimentsProvider>
                      <>
                        {children}
                        <DynamicCookieBannerWrapper />
                      </>
                    </ExperimentsProvider>
                  </TooltipProvider>
                </RainbowKitProvider>
              </OnchainKitProvider>
            </QueryClientProvider>
          </WagmiProvider>
        </MotionConfig>
      </CookieManagerProvider>
    </ErrorsProvider>
  );
}
