"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";
import { getMyCredentials, getCredentialDetails } from "@/lib/contract";

interface EncryptedCredential {
    id: string;
    created_at: string;
    ipfs_cid: string;
    encryption_key: string;
    iv: string;
    metadata: {
        typeName: string;
        issuedAt: string;
        description: string;
        [key: string]: any;
    };
}

export default function DashboardPage() {
    const { address, isConnected } = useAccount();
    const { connect } = useConnect();

    const [credentials, setCredentials] = useState<EncryptedCredential[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");


    // ... (existing imports)

    // Fetch credentials when address changes
    useEffect(() => {
        if (isConnected && address) {
            fetchCredentials(address);
        } else {
            setCredentials([]);
        }
    }, [address, isConnected]);

    const fetchCredentials = async (walletAddress: string) => {
        try {
            setLoading(true);
            setError("");

            // 1. Get IDs from Blockchain
            const result = await getMyCredentials();
            if (!result.ok || !result.data) {
                // If it fails (e.g. no wallet or network error), just fallback to empty or error
                console.error("Blockchain fetch failed:", result.error);
                throw new Error("Failed to fetch credentials from blockchain.");
            }

            const credentialIds = result.data as string[];

            if (!credentialIds || credentialIds.length === 0) {
                setCredentials([]);
                return;
            }

            // 2. Resolve Details for each ID
            const blockchainCreds = await Promise.all(
                credentialIds.map(async (id) => {
                    const details = await getCredentialDetails(id);
                    if (details.ok && details.data) {
                        return { id, ...details.data };
                    }
                    return null;
                })
            );

            // Filter out failures and revoked credentials (optional: keep revoked if UI supports it)
            const validCreds = blockchainCreds.filter(c => c !== null);
            // If you want to hide revoked: .filter(c => !c.isRevoked)

            if (validCreds.length === 0) {
                setCredentials([]);
                return;
            }

            // 3. Enrich from Supabase (to get keys/metadata)
            const cids = validCreds.map(c => c!.ipfsHash);

            const { data: supabaseData, error: sbError } = await supabase
                .from("user_credentials")
                .select("*")
                .in("ipfs_cid", cids);

            if (sbError) throw sbError;

            // Merge Blockchain Data with Supabase Metadata
            const finalCredentials = validCreds.map(bc => {
                const meta = supabaseData?.find(sd => sd.ipfs_cid === bc!.ipfsHash);

                // If we don't have metadata/keys locally, we can't fully display it securely or with rich text
                // For now, we only show ones we can decrypt/describe
                if (!meta) return null;

                return {
                    id: bc!.id, // Blockchain Credential ID
                    created_at: meta.created_at, // Use Supabase time or fetch block time if critical
                    ipfs_cid: bc!.ipfsHash,
                    encryption_key: meta.encryption_key,
                    iv: meta.iv,
                    metadata: meta.metadata || { typeName: "Unknown Credential", description: "Metadata unavailable" }
                };
            }).filter((c): c is EncryptedCredential => c !== null);

            setCredentials(finalCredentials);
        } catch (e) {
            console.error(e);
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="w-full min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">My Credentials</h1>

                    {/* Wallet Connection / Status */}
                    {isConnected ? (
                        <div className="flex items-center gap-4">
                            <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full border border-blue-200">
                                {address?.slice(0, 6)}...{address?.slice(-4)}
                            </span>
                        </div>
                    ) : (
                        <button
                            onClick={() => connect({ connector: injected() })}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition-colors"
                        >
                            Connect Wallet to View
                        </button>
                    )}
                </header>

                <div className="bg-white p-6 rounded-xl shadow-sm min-h-[400px]">
                    {!isConnected ? (
                        <div className="flex flex-col items-center justify-center h-full text-center mt-20">
                            <div className="text-6xl mb-4">🔐</div>
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">Wallet Disconnected</h2>
                            <p className="text-gray-500 max-w-sm mx-auto">
                                Please connect your Ethereum wallet to access your secured credentials.
                            </p>
                        </div>
                    ) : loading ? (
                        <p className="text-center text-gray-500 mt-20 animate-pulse">Loading Credentials...</p>
                    ) : error ? (
                        <p className="text-center text-red-500 mt-20">Error: {error}</p>
                    ) : credentials.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center mt-20">
                            <div className="text-6xl mb-4">📭</div>
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Credentials Found</h2>
                            <p className="text-gray-500">
                                You haven't received any credentials yet.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {credentials.map(cred => (
                                <div key={cred.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-white flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-lg font-bold text-gray-800 truncate">
                                                {cred.metadata.typeName}
                                            </h3>
                                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                                {new Date(cred.created_at).toLocaleDateString()}
                                            </span>
                                        </div>

                                        {cred.metadata.description && (
                                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                                                {cred.metadata.description}
                                            </p>
                                        )}

                                        <div className="text-xs text-mono text-gray-400 mb-4 truncate">
                                            CID: {cred.ipfs_cid}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-2">
                                        <Link
                                            href={`/view/${cred.ipfs_cid}?id=${cred.id}#key=${encodeURIComponent(cred.encryption_key)}&iv=${encodeURIComponent(cred.iv)}`}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 rounded text-sm font-medium transition-colors"
                                        >
                                            View
                                        </Link>
                                        <button
                                            onClick={() => {
                                                const link = `${window.location.origin}/view/${cred.ipfs_cid}?id=${cred.id}#key=${encodeURIComponent(cred.encryption_key)}&iv=${encodeURIComponent(cred.iv)}`;
                                                navigator.clipboard.writeText(link);
                                                alert("Link copied to clipboard!");
                                            }}
                                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-sm font-medium transition-colors"
                                            title="Copy Share Link"
                                        >
                                            🔗
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
