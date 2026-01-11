"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, Wallet, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function WalletConnect() {
    const {
        isConnected,
        address,
        connectWallet,
        disconnectWallet,
        balance,
        formatBalance,
    } = useWallet();
    const [copied, setCopied] = useState(false);

    const copyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent hydration mismatch
    if (!mounted) return (
        <Button disabled className="font-semibold gap-2 opacity-50">
            <Wallet className="h-4 w-4" />
            Loading...
        </Button>
    );

    if (!isConnected) {
        return (
            <Button onClick={connectWallet} className="font-semibold gap-2">
                <Wallet className="h-4 w-4" />
                Connect Wallet
            </Button>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-xs font-medium text-muted-foreground">Balance</span>
                <span className="text-sm font-bold tabular-nums">
                    {balance ? formatBalance(balance) : "Loading..."}
                </span>
            </div>
            <div className="relative group">
                <Button variant="outline" className="gap-2 pl-3 pr-2 h-10 border-primary/20 bg-background/50 backdrop-blur-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-mono">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>

                {/* Simple Dropdown implementation to avoid heavy dependency setup for now if not needed */}
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border bg-card p-1 shadow-lg text-popover-foreground opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="px-2 py-1.5 text-sm font-semibold">My Wallet</div>
                    <div
                        onClick={copyAddress}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                    >
                        {copied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
                        Copy Address
                    </div>
                    <div className="h-px bg-border my-1" />
                    <div
                        onClick={() => disconnectWallet()}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-destructive hover:text-destructive-foreground"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Disconnect
                    </div>
                </div>
            </div>
        </div>
    );
}
