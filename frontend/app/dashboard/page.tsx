"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";
import {
    getMyCredentials,
    getCredentialDetails,
    getIssuedCredentials,
    revokeCredential
} from "@/lib/contract";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, ShieldAlert, Loader2, Inbox } from "lucide-react";

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
    const { isIssuer } = useUserRole();

    const [credentials, setCredentials] = useState<EncryptedCredential[]>([]);
    const [issuedCredentials, setIssuedCredentials] = useState<EncryptedCredential[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isConnected && address) {
            fetchCredentials(address);
            if (isIssuer) {
                fetchIssuedCredentials(address);
            }
        } else {
            setCredentials([]);
            setIssuedCredentials([]);
        }
    }, [address, isConnected, isIssuer]);

    const fetchCredentials = async (walletAddress: string) => {
        try {
            setLoading(true);
            setError("");

            const result = await getMyCredentials();
            if (!result.ok || !result.data) {
                setCredentials([]);
                return;
            }

            const credentialIds = result.data as string[];
            if (!credentialIds || credentialIds.length === 0) {
                setCredentials([]);
                return;
            }

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
                setCredentials([]);
                return;
            }

            const cids = validCreds.map(c => c!.ipfsHash);
            const { data: supabaseData } = await supabase
                .from("user_credentials")
                .select("*")
                .in("ipfs_cid", cids);

            const finalCredentials = validCreds.map(bc => {
                const meta = supabaseData?.find(sd => sd.ipfs_cid === bc!.ipfsHash);
                if (!meta) return null;

                return {
                    id: bc!.id,
                    created_at: meta.created_at,
                    ipfs_cid: bc!.ipfsHash,
                    encryption_key: meta.encryption_key,
                    iv: meta.iv,
                    isRevoked: bc!.isRevoked,
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
            const result = await getIssuedCredentials();
            if (!result.ok || !result.data) return;

            const credentialIds = result.data as string[];
            if (!credentialIds || credentialIds.length === 0) {
                setIssuedCredentials([]);
                return;
            }

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
            const cids = validCreds.map(c => c!.ipfsHash);

            const { data: supabaseData } = await supabase
                .from("user_credentials")
                .select("*")
                .in("ipfs_cid", cids);

            const finalIssuedCredentials = validCreds.map(bc => {
                const meta = supabaseData?.find(sd => sd.ipfs_cid === bc!.ipfsHash);
                return {
                    id: bc!.id,
                    created_at: meta?.created_at || new Date().toISOString(),
                    ipfs_cid: bc!.ipfsHash,
                    encryption_key: meta?.encryption_key || "",
                    iv: meta?.iv || "",
                    isRevoked: bc!.isRevoked,
                    validUntil: bc!.validUntil,
                    holder: bc!.holder,
                    issuer: bc!.issuer,
                    metadata: meta?.metadata || { typeName: "Issued Credential", description: "No metadata found" }
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
                if (address) {
                    fetchCredentials(address);
                    fetchIssuedCredentials(address);
                }
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to revoke: " + (e as any).message);
        } finally {
            setLoading(false);
        }
    }

    const copyLink = (cred: EncryptedCredential) => {
        const link = `${window.location.origin}/view/${cred.ipfs_cid}?id=${cred.id}#key=${encodeURIComponent(cred.encryption_key)}&iv=${encodeURIComponent(cred.iv)}`;
        navigator.clipboard.writeText(link);
        alert("Link copied to clipboard!");
    };

    if (!isConnected) {
        return (
            <main className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
                <div className="bg-primary/5 p-8 rounded-full mb-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/10 scale-0 group-hover:scale-100 transition-transform duration-500 rounded-full" />
                    <ShieldAlert className="h-16 w-16 text-primary relative z-10" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-3">Welcome to ZK Credential</h1>
                <p className="text-muted-foreground max-w-md mb-8">
                    Connect your wallet to access your secure, verifiable credentials stored on the blockchain.
                </p>
                {/* Button hidden here because it's in the Navbar primarily, but we can add a visual call to action */}
                <div className="p-4 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-lg text-sm font-medium border border-yellow-500/20">
                    ← Use the Connect Wallet button in the top right to get started.
                </div>
            </main>
        );
    }

    return (
        <main className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-10">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    My Credentials
                    {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                </h1>
                <p className="text-muted-foreground mt-2">Manage and view your verified credentials.</p>
                {error && <p className="text-destructive mt-2 text-sm">Error: {error}</p>}
            </header>

            {/* Received Credentials */}
            <section className="mb-12">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Inbox className="h-5 w-5 text-primary" /> Received
                    </h2>
                    <Badge variant="outline">{credentials.length} Items</Badge>
                </div>

                {credentials.length === 0 && !loading ? (
                    <div className="flex flex-col items-center justify-center py-16 border rounded-xl bg-muted/20 border-dashed border-muted text-center">
                        <Inbox className="h-10 w-10 text-muted-foreground opacity-50 mb-3" />
                        <p className="text-muted-foreground font-medium">No credentials found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {credentials.map(cred => (
                            <CredentialCard key={cred.id} cred={cred} onCopy={() => copyLink(cred)} />
                        ))}
                    </div>
                )}
            </section>

            {/* Issued Credentials (Issuer Only) */}
            {isIssuer && (
                <section>
                    <div className="flex items-center justify-between mb-6 border-t pt-10">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-indigo-500" /> Issued by Me
                        </h2>
                        <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20">
                            {issuedCredentials.length} Issued
                        </Badge>
                    </div>

                    {issuedCredentials.length === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center py-16 border rounded-xl bg-muted/20 border-dashed border-muted text-center">
                            <p className="text-muted-foreground">You haven't issued any credentials yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {issuedCredentials.map(cred => (
                                <CredentialCard
                                    key={cred.id}
                                    cred={cred}
                                    isIssuerView
                                    onRevoke={() => handleRevoke(cred.id)}
                                    onCopy={() => copyLink(cred)}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}
        </main>
    );
}

function CredentialCard({
    cred,
    isIssuerView = false,
    onRevoke,
    onCopy
}: {
    cred: EncryptedCredential,
    isIssuerView?: boolean,
    onRevoke?: () => void,
    onCopy: () => void
}) {
    return (
        <Card className={`group transition-all hover:shadow-lg hover:border-primary/50 flex flex-col justify-between overflow-hidden ${cred.isRevoked ? 'bg-destructive/5 border-destructive/30' : ''}`}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className={`truncate text-lg leading-tight ${cred.isRevoked ? 'text-destructive line-through decoration-2' : ''}`}>
                        {cred.metadata.typeName}
                    </CardTitle>
                    {cred.isRevoked ? (
                        <Badge variant="destructive" className="shrink-0 uppercase text-[10px]">Revoked</Badge>
                    ) : (
                        <Badge variant="outline" className="shrink-0 bg-background text-[10px] text-muted-foreground">Valid</Badge>
                    )}
                </div>
                <CardDescription className="line-clamp-2 text-xs mt-1">
                    {cred.metadata.description}
                </CardDescription>
            </CardHeader>

            <CardContent className="pb-3 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>
                        <span className="block font-semibold uppercase text-[10px] tracking-wider opacity-70">Issued</span>
                        <span className="font-mono">{new Date(cred.created_at).toLocaleDateString()}</span>
                    </div>
                    {cred.validUntil > BigInt(0) && (
                        <div>
                            <span className="block font-semibold uppercase text-[10px] tracking-wider opacity-70">Expires</span>
                            <span className="font-mono text-orange-500/80">
                                {new Date(Number(cred.validUntil) * 1000).toLocaleDateString()}
                            </span>
                        </div>
                    )}
                </div>

                {isIssuerView && (
                    <div className="pt-2 border-t border-border/50">
                        <span className="block font-semibold uppercase text-[10px] tracking-wider opacity-70 mb-1">Holder</span>
                        <div className="bg-muted/50 p-1.5 rounded font-mono text-[10px] break-all">
                            {cred.holder}
                        </div>
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-0 gap-2">
                <Button asChild size="sm" className="flex-1 w-full" variant={cred.isRevoked ? "outline" : "default"}>
                    <Link href={`/view/${cred.ipfs_cid}?id=${cred.id}#key=${encodeURIComponent(cred.encryption_key)}&iv=${encodeURIComponent(cred.iv)}`}>
                        <ExternalLink className="mr-2 h-3 w-3" /> View
                    </Link>
                </Button>

                <Button variant="secondary" size="icon" className="h-9 w-9" onClick={onCopy} title="Copy Link">
                    <Copy className="h-4 w-4" />
                </Button>

                {isIssuerView && !cred.isRevoked && onRevoke && (
                    <Button variant="destructive" size="sm" onClick={onRevoke} title="Revoke">
                        Revoke
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
