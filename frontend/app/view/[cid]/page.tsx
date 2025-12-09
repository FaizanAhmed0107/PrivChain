"use client";

import { useSearchParams } from "next/navigation";
import { getCredentialDetails, revokeCredential } from "@/lib/contract";
import { useEffect, useState, use } from "react";
import { decryptBundle } from "@/utils/bundleEncryption";
import { useTemplates } from "@/hooks/useTemplates";
import { useWallet } from "@/lib/wallet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, AlertCircle, FileText, Download, Shield, Calendar, User, Eye, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CredentialData {
    metadata: Record<string, any>;
    fileBlob: Blob;
    fileDetails: {
        name: string;
        type: string;
    };
}

export default function ViewPage({ params }: { params: Promise<{ cid: string }> }) {
    const { cid: ipfsCidProp } = use(params);
    const searchParams = useSearchParams();
    const credId = searchParams.get("id");

    // Wallet needed for Revoking, but viewing is public (if keys present)
    const { address: userAddress, isConnected } = useWallet();
    const { templates } = useTemplates();

    const [status, setStatus] = useState("Initializing...");
    const [data, setData] = useState<CredentialData | null>(null);
    const [fileUrl, setFileUrl] = useState<string>("");

    const [isRevoked, setIsRevoked] = useState(false);
    const [issuer, setIssuer] = useState<string>("");
    const [holder, setHolder] = useState<string>("");
    const [verificationStatus, setVerificationStatus] = useState<"verifying" | "valid" | "revoked" | "expired" | "not_found">("verifying");
    const [revoking, setRevoking] = useState(false);

    const handleRevoke = async () => {
        if (!confirm("Are you sure you want to revoke this credential? This cannot be undone.")) return;
        setRevoking(true);
        if (!credId) return alert("Missing Credential ID");
        try {
            const res = await revokeCredential(credId);
            if (res.ok) {
                alert("Credential Revoked Successfully!");
                setIsRevoked(true);
                setVerificationStatus("revoked");
            } else {
                alert("Error revoking credential: " + res.error);
            }
        } catch (e) {
            console.error(e);
            alert("Error: " + (e as Error).message);
        } finally {
            setRevoking(false);
        }
    };

    useEffect(() => {
        const loadCredential = async () => {
            try {
                if (!credId) {
                    setStatus("Error: Missing Credential ID in URL");
                    setVerificationStatus("not_found");
                    return;
                }

                setStatus("Verifying Credential on Blockchain...");

                // 1. Fetch Details from Smart Contract
                const detailsRes = await getCredentialDetails(credId);

                if (!detailsRes.ok || !detailsRes.data || !detailsRes.data.ipfsHash) {
                    setVerificationStatus("not_found");
                    setStatus("Error: Credential not found on blockchain.");
                    return;
                }

                const { ipfsHash, isRevoked, validUntil, issuer, holder } = detailsRes.data;
                setIssuer(issuer);
                setHolder(holder);
                setIsRevoked(isRevoked);

                if (isRevoked) {
                    setVerificationStatus("revoked");
                } else {
                    const now = BigInt(Math.floor(Date.now() / 1000));
                    if (validUntil > BigInt(0) && now > validUntil) {
                        setVerificationStatus("expired");
                    } else {
                        setVerificationStatus("valid");
                    }
                }

                // 2. Parse Hash params for Key and IV
                if (typeof window !== 'undefined') {
                    const hash = window.location.hash.substring(1);
                    const params = new URLSearchParams(hash);
                    const keyStr = params.get("key");
                    const ivStr = params.get("iv");

                    if (!keyStr || !ivStr) {
                        setStatus("Error: Missing Encryption Keys in Link.");
                        return;
                    }

                    // 3. Fetch Encrypted Bundle
                    setStatus("Fetching Encrypted Data from IPFS...");
                    const gatewayUrl = `/api/ipfs/${ipfsHash}`;
                    const res = await fetch(gatewayUrl);
                    if (!res.ok) throw new Error("Failed to fetch from IPFS");
                    const encryptedBlob = await res.blob();

                    // 4. Decrypt
                    setStatus("Decrypting secure bundle...");
                    const result = await decryptBundle(encryptedBlob, keyStr, ivStr);

                    // 5. Set Data
                    setData(result);
                    const url = URL.createObjectURL(result.fileBlob);
                    setFileUrl(url);
                    setStatus("");
                }
            } catch (e) {
                console.error(e);
                setStatus("Error: " + (e as Error).message);
            }
        };

        if (credId) {
            loadCredential();
        }
    }, [credId]);

    // Helper: Find Label
    const getFieldLabel = (key: string) => {
        if (!data) return key;
        const typeId = data.metadata.typeId;
        if (typeId) {
            const template = templates.find(t => t.id === typeId);
            const field = template?.fields.find(f => f.key === key);
            if (field) return field.label;
        }
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    };

    if (status) {
        return (
            <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 bg-background space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse font-medium">{status}</p>
            </div>
        );
    }

    if (!data) return null;

    const hiddenKeys = ["typeId", "typeName", "issuedAt", "description", "validUntil"];
    const displayKeys = Object.keys(data.metadata).filter(k => !hiddenKeys.includes(k));

    return (
        <main className="container mx-auto px-4 py-8 max-w-6xl animate-in fade-in zoom-in-95 duration-500">

            {/* Verification Status Banner */}
            <div className="flex justify-center mb-8">
                <div className={cn(
                    "px-6 py-3 rounded-full font-bold flex items-center gap-3 shadow-sm border transition-all duration-300",
                    verificationStatus === "valid" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800" :
                        verificationStatus === "revoked" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" :
                            "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
                )}>
                    {verificationStatus === "valid" ? <CheckCircle className="w-6 h-6" /> :
                        verificationStatus === "revoked" ? <XCircle className="w-6 h-6" /> :
                            <AlertCircle className="w-6 h-6" />}

                    <span className="text-lg tracking-tight">
                        {verificationStatus === "valid" ? "Verified Valid Credential" :
                            verificationStatus === "revoked" ? "Credential Revoked" :
                                verificationStatus === "expired" ? "Credential Expired" : "Verification Failed"}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Left Column: Metadata Card */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="overflow-hidden border-t-4 border-t-primary shadow-lg">
                        <CardHeader className="bg-muted/50 pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Badge variant="outline" className="mb-2 bg-background">{data.metadata.typeId || "Credential"}</Badge>
                                    <CardTitle className="text-2xl">{data.metadata.typeName || "Credential Details"}</CardTitle>
                                </div>
                                <Shield className="h-8 w-8 text-muted-foreground/20" />
                            </div>
                            <CardDescription className="mt-2 text-sm">
                                {data.metadata.description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-5">

                            <div className="flex items-center gap-3 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold uppercase">Issued Date</p>
                                    <p className="font-medium">{new Date(data.metadata.issuedAt).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {data.metadata.validUntil && data.metadata.validUntil !== "0" && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Calendar className="h-4 w-4 text-orange-500" />
                                    <div>
                                        <p className="text-xs text-muted-foreground font-semibold uppercase">Valid Until</p>
                                        <p className="font-medium text-orange-600 dark:text-orange-400">
                                            {new Date(data.metadata.validUntil).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t border-dashed space-y-4">
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold uppercase mb-1 flex items-center gap-1">
                                        <User className="h-3 w-3" /> Issuer
                                    </p>
                                    <div className="bg-muted/50 p-2 rounded text-xs font-mono break-all border border-border/50">
                                        {issuer}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold uppercase mb-1 flex items-center gap-1">
                                        <User className="h-3 w-3" /> Holder
                                    </p>
                                    <div className="bg-muted/50 p-2 rounded text-xs font-mono break-all border border-border/50">
                                        {holder}
                                    </div>
                                </div>
                            </div>

                            {displayKeys.length > 0 && (
                                <div className="pt-4 border-t border-dashed">
                                    <p className="text-xs text-center text-muted-foreground font-semibold uppercase mb-3">Custom Fields</p>
                                    <div className="grid grid-cols-1 gap-3">
                                        {displayKeys.map(key => (
                                            <div key={key} className="flex justify-between items-center text-sm p-2 rounded bg-secondary/30">
                                                <span className="text-muted-foreground">{getFieldLabel(key)}</span>
                                                <span className="font-bold">{data.metadata[key]}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </CardContent>
                        <CardFooter className="bg-muted/20 flex flex-col gap-2">
                            {/* Revoke Button for Issuer */}
                            {isConnected && userAddress && issuer && userAddress.toLowerCase() === issuer.toLowerCase() && !isRevoked && (
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={handleRevoke}
                                    disabled={revoking}
                                >
                                    {revoking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertCircle className="mr-2 h-4 w-4" />}
                                    Revoke Credential
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                </div>

                {/* Right Column: File Viewer */}
                <div className="lg:col-span-8">
                    <Card className="h-full min-h-[600px] flex flex-col shadow-md">
                        <CardHeader className="pb-2 border-b">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Eye className="h-5 w-5 text-primary" />
                                    Credential Document
                                </CardTitle>
                                <Button variant="ghost" size="sm" asChild>
                                    <a href={fileUrl} download={data.fileDetails.name}>
                                        <Download className="h-4 w-4 mr-2" /> Download
                                    </a>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 bg-muted/30 flex items-center justify-center overflow-hidden relative group">
                            {data.fileDetails.type.includes("pdf") ? (
                                <iframe src={fileUrl} className="w-full h-[800px] border-none" />
                            ) : (
                                <div className="relative w-full h-full flex items-center justify-center p-4">
                                    <img
                                        src={fileUrl}
                                        alt="Credential"
                                        className="max-w-full max-h-[800px] object-contain shadow-2xl rounded-sm transition-transform duration-500 group-hover:scale-[1.01]"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

            </div>
        </main>
    );
}
