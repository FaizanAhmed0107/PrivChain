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
            <div className="flex flex-col items-end mr-2 text-right">
                <span className="text-xs font-medium text-muted-foreground">Balance</span>
                <span className="text-sm font-bold tabular-nums">
                    {balance ? formatBalance(balance) : "Loading..."}
                </span>
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 pl-3 pr-2 h-10 border-primary/20 bg-background/50 backdrop-blur-sm">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="font-mono">
                            {address?.slice(0, 6)}...{address?.slice(-4)}
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Wallet</DropdownMenuLabel>
                    <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
                        {copied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
                        Copy Address
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => disconnectWallet()} className="cursor-pointer text-destructive focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Disconnect
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
