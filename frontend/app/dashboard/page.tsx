"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";
import {
    getMyCredentials,
    getCredentialDetails,
    checkIsIssuer,
    getIssuedCredentials,
    revokeCredential
} from "@/lib/contract";

interface EncryptedCredential {
    id: string;
    created_at: string;
    ipfs_cid: string;
    encryption_key: string;
    iv: string;
    isRevoked: boolean;
    validUntil: bigint;
    holder: string;
    issuer: string;
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
    const [issuedCredentials, setIssuedCredentials] = useState<EncryptedCredential[]>([]); // New state for issued creds
    const [loading, setLoading] = useState(false);
    const [isIssuer, setIsIssuer] = useState(false); // New state for issuer check
    const [error, setError] = useState("");


    // ... (existing imports)

    // Fetch credentials when address changes
    useEffect(() => {
        if (isConnected && address) {
            checkIssuerStatus(address);
            fetchCredentials(address);

        } else {
            setCredentials([]);
            setIssuedCredentials([]);
            setIsIssuer(false);
        }
    }, [address, isConnected]);

    // Check if the connected user is an issuer
    const checkIssuerStatus = async (userAddress: string) => {
        const result = await checkIsIssuer(userAddress);
        if (result.ok && result.isIssuer) {
            setIsIssuer(true);
            fetchIssuedCredentials(userAddress);
        } else {
            setIsIssuer(false);
        }
    }

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

            // Filter out failures
            const validCreds = blockchainCreds.filter(c => c !== null);

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
                    isRevoked: bc!.isRevoked, // Add isRevoked status
                    validUntil: bc!.validUntil,
                    holder: bc!.holder,
                    issuer: bc!.issuer,
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

    const fetchIssuedCredentials = async (walletAddress: string) => {
        try {
            // 1. Get IDs of issued credentials
            const result = await getIssuedCredentials();
            if (!result.ok || !result.data) {
                console.error("Failed to fetch issued credentials:", result.error);
                return;
            }

            const credentialIds = result.data as string[];
            if (!credentialIds || credentialIds.length === 0) {
                setIssuedCredentials([]);
                return;
            }

            // 2. Resolve Details
            const blockchainCreds = await Promise.all(
                credentialIds.map(async (id) => {
                    const details = await getCredentialDetails(id);
                    if (details.ok && details.data) {
                        return { id, ...details.data };
                    }
                    return null;
                })
            );

            const validCreds = blockchainCreds.filter(c => c !== null);

            if (validCreds.length === 0) {
                setIssuedCredentials([]);
                return;
            }

            // 3. Enrich from Supabase
            const cids = validCreds.map(c => c!.ipfsHash);

            const { data: supabaseData, error: sbError } = await supabase
                .from("user_credentials")
                .select("*")
                .in("ipfs_cid", cids);

            const finalIssuedCredentials = validCreds.map(bc => {
                const meta = supabaseData?.find(sd => sd.ipfs_cid === bc!.ipfsHash);

                // For issued credentials, strictly speaking, we might not have the encryption key if we didn't store it
                // But usually the issuer does. If not present, we can still show the ID and revocation status.
                // We'll try to form the object.

                return {
                    id: bc!.id,
                    created_at: meta?.created_at || new Date().toISOString(), // Fallback
                    ipfs_cid: bc!.ipfsHash,
                    encryption_key: meta?.encryption_key || "", // Might be empty if not in DB
                    iv: meta?.iv || "",
                    isRevoked: bc!.isRevoked,
                    validUntil: bc!.validUntil,
                    holder: bc!.holder,
                    issuer: bc!.issuer,
                    metadata: meta?.metadata || { typeName: "Issued Credential", description: "No metadata found locally" }
                };
            });

            setIssuedCredentials(finalIssuedCredentials);

        } catch (e) {
            console.error("Error fetching issued credentials", e);
        }
    }

    const handleRevoke = async (credId: string) => {
        if (!confirm("Are you sure you want to revoke this credential? This action cannot be undone.")) return;

        try {
            setLoading(true);
            const result = await revokeCredential(credId);
            if (result.ok) {
                alert("Credential Revoked Successfully!");
                // Refresh lists
                if (address) {
                    fetchCredentials(address);
                    fetchIssuedCredentials(address);
                }
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to revoke credential.");
        } finally {
            setLoading(false);
        }
    }

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
                            {isIssuer && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200 font-medium">Issuer</span>}
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
                    ) : (
                        <div className="space-y-12">
                            {/* Received Credentials Section */}
                            <section>
                                <h2 className="text-xl font-bold text-gray-700 mb-4">Received Credentials</h2>
                                {credentials.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-gray-100 rounded-lg">
                                        <div className="text-4xl mb-2">📭</div>
                                        <p className="text-gray-500">You haven't received any credentials yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {credentials.map(cred => (
                                            <div key={cred.id} className={`border rounded-lg p-5 hover:shadow-md transition-shadow flex flex-col justify-between ${cred.isRevoked ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                                                <div>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className={`text-lg font-bold truncate ${cred.isRevoked ? 'text-red-800' : 'text-gray-800'}`}>
                                                            {cred.metadata.typeName}
                                                        </h3>
                                                        <div className="flex gap-2">
                                                            {cred.isRevoked && <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded font-bold">REVOKED</span>}
                                                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                                                {new Date(cred.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {cred.metadata.description && (
                                                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                                                            {cred.metadata.description}
                                                        </p>
                                                    )}

                                                    {cred.validUntil > BigInt(0) && (
                                                        <div className="mb-2">
                                                            <span className="text-xs text-gray-400 font-semibold uppercase">Valid Until: </span>
                                                            <span className="text-xs text-gray-600">
                                                                {new Date(Number(cred.validUntil) * 1000).toLocaleDateString()}
                                                            </span>
                                                        </div>
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
                            </section>

                            {/* Issued Credentials Section (Only for Issuers) */}
                            {isIssuer && (
                                <section>
                                    <h2 className="text-xl font-bold text-gray-700 mb-4 border-t pt-8">Issued Credentials</h2>
                                    {issuedCredentials.length === 0 ? (
                                        <p className="text-gray-500 italic">You haven't issued any credentials yet.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {issuedCredentials.map(cred => (
                                                <div key={cred.id} className={`border rounded-lg p-5 hover:shadow-md transition-shadow flex flex-col justify-between ${cred.isRevoked ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                                                    <div>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h3 className={`text-lg font-bold truncate ${cred.isRevoked ? 'text-red-800' : 'text-gray-800'}`}>
                                                                {cred.metadata.typeName}
                                                            </h3>
                                                            {cred.isRevoked && <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded font-bold">REVOKED</span>}
                                                        </div>
                                                        <p className="text-sm text-gray-600 mb-2">
                                                            <strong>Holder:</strong> <span className="font-mono text-xs">{cred.holder}</span>
                                                        </p>

                                                        {cred.validUntil > BigInt(0) && (
                                                            <div className="mb-2">
                                                                <span className="text-xs text-gray-400 font-semibold uppercase">Valid Until: </span>
                                                                <span className="text-xs text-gray-600">
                                                                    {new Date(Number(cred.validUntil) * 1000).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <p className="text-xs text-gray-400 mb-4 truncate">
                                                            CID: {cred.ipfs_cid}
                                                        </p>
                                                    </div>

                                                    <div className="flex gap-2 mt-2">
                                                        <Link
                                                            href={`/view/${cred.ipfs_cid}?id=${cred.id}#key=${encodeURIComponent(cred.encryption_key)}&iv=${encodeURIComponent(cred.iv)}`}
                                                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-center py-2 rounded text-sm font-medium transition-colors"
                                                        >
                                                            View Details
                                                        </Link>
                                                        {!cred.isRevoked && (
                                                            <button
                                                                onClick={() => handleRevoke(cred.id)}
                                                                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-center py-2 rounded text-sm font-medium transition-colors"
                                                            >
                                                                Revoke
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
