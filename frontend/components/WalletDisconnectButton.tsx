"use client";

import { useWallet } from "@/lib/wallet";

export default function WalletDisconnectButton() {
    const { isConnected, disconnectWallet, address } = useWallet();

    if (!isConnected) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-white p-2 rounded-lg shadow-lg border border-gray-200">
            <div className="flex flex-col">
                <span className="text-xs text-gray-500 font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
            </div>
            <button
                onClick={disconnectWallet}
                className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-1 px-3 rounded transition-colors"
            >
                Disconnect
            </button>
        </div>
    );
}
