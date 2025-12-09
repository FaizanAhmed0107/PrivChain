"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, Lock, FileCheck, ArrowRight, Zap, Globe } from "lucide-react";
import { useWallet } from "@/lib/wallet";

export default function LandingPage() {
  const { isConnected } = useWallet();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-48">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-background z-0" />
        <div className="container relative z-10 px-4 md:px-8 mx-auto text-center max-w-5xl">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
            v1.0 Now Live
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-indigo-600 animate-in fade-in slide-in-from-bottom-6 duration-700">
            PrivChain
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Secure, verifiable, and decentralized credentials on the blockchain.
            Empowering issuers and holders with Zero-Knowledge privacy principles.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200">
            <Button size="lg" className="text-lg px-8 h-12 rounded-full shadow-lg shadow-primary/20" asChild>
              <Link href="/dashboard">
                {isConnected ? "Go to Dashboard" : "Launch App"} <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 h-12 rounded-full" asChild>
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container px-4 md:px-8 mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Why PrivChain?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for the future of digital identity. Verification without compromise.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Shield className="h-10 w-10 text-primary" />}
              title="Tamper-Proof"
              description="Credentials are anchored on-chain with cryptographic proofs. Impossible to forge or alter once issued."
            />
            <FeatureCard
              icon={<Lock className="h-10 w-10 text-indigo-500" />}
              title="Privacy First"
              description="Data is encrypted using AES-256 before storage on IPFS. Only the holder and issuer possess the decryption keys."
            />
            <FeatureCard
              icon={<Globe className="h-10 w-10 text-pink-500" />}
              title="Decentralized Storage"
              description="Credential files are stored on IPFS, ensuring redundancy, availability, and censorship resistance."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24">
        <div className="container px-4 md:px-8 mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Streamlined Workflow</h2>
              <div className="space-y-8">
                <Step number="01" title="Issuer Connects" description="Authorized organizations connect their wallet to the PrivChain admin panel." />
                <Step number="02" title="Credential Issuance" description="The issuer uploads a certificate, fills in metadata, and signs the transaction." />
                <Step number="03" title="Holder Verifies" description="The recipient receives the credential instantly in their dashboard, verifiable by anyone with the link." />
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <div className="relative bg-card border border-border rounded-xl p-8 shadow-2xl skew-y-3 hover:skew-y-0 transition-transform duration-500">
                <div className="flex items-center gap-4 mb-6 border-b pb-4">
                  <FileCheck className="h-8 w-8 text-green-500" />
                  <div>
                    <h3 className="font-bold">Verified Credential</h3>
                    <p className="text-xs text-muted-foreground">Issued on Ethereum (Localhost)</p>
                  </div>
                </div>
                <div className="space-y-4 opacity-50">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-32 bg-muted rounded w-full"></div>
                </div>
                <div className="mt-6 flex justify-end">
                  <div className="h-8 w-24 bg-primary rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-muted/10">
        <div className="container px-4 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} PrivChain. All rights reserved.</p>
          <p className="mt-2">Built with Next.js, Tailwind, Wagmi & Hardhat.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-card p-8 rounded-xl border border-border hover:shadow-lg transition-shadow group">
      <div className="mb-4 bg-primary/5 w-fit p-3 rounded-lg group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function Step({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="flex gap-4">
      <div className="text-4xl font-bold text-primary/20">{number}</div>
      <div>
        <h4 className="text-lg font-bold">{title}</h4>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
