import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { defineChain, http } from "viem";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "@rainbow-me/rainbowkit/styles.css";

const scaiMainnet = defineChain({
  id: 34,
  name: "SCAI Mainnet",
  nativeCurrency: { name: "SCAI", symbol: "SCAI", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://mainnet-rpc.scai.network"] },
  },
  blockExplorers: {
    default: { name: "SCAI Explorer", url: "https://explorer.scai.network" },
  },
});

const config = getDefaultConfig({
  appName: "STK Staking",
  projectId: "f51c9f1690ed3aa6637ca65e3feb23c9",
  chains: [scaiMainnet],
  transports: {
    [scaiMainnet.id]: http("https://mainnet-rpc.scai.network"),
  },
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);