"use client";

import type { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/lib/wagmi";
// @ts-ignore - allow importing CSS without type declarations
import "./globals.css";
// import WalletDisconnectButton from "@/components/WalletDisconnectButton"; // Removed in favor of Navbar integration
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/Navbar";

const queryClient = new QueryClient();
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryClientProvider client={queryClient}>
            <WagmiProvider config={config}>
              <Navbar />
              {children}
            </WagmiProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
