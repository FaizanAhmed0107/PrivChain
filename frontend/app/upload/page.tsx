"use client";

import { useState, useEffect } from "react";
import { pinata } from "@/utils/config";
import { encryptBundle } from "@/utils/bundleEncryption";
import { useTemplates } from "@/hooks/useTemplates";
import { isAddress } from "viem";
import { supabase } from "@/utils/supabaseClient";
import { issueCredential } from "@/lib/contract";
import { useWallet } from "@/lib/wallet";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, UploadCloud, FileText, CheckCircle, ExternalLink, AlertTriangle } from "lucide-react";
import Link from "next/link";

import { generateSalt, generateCommitment } from "@/utils/zkp";

export default function IssuePage() {
    const { activeTemplates, loading: loadingTemplates } = useTemplates();
    const [file, setFile] = useState<File>();

    // Wallet & Role
    const { address: issuerAddress, isConnected, chainId, switchChain } = useWallet();
    const { isIssuer, loading: loadingRole } = useUserRole();

    // Type Selection
    const [selectedTypeId, setSelectedTypeId] = useState("");
    const selectedType = activeTemplates.find(t => t.id === selectedTypeId);

    // Dynamic Form State
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [receiverAddress, setReceiverAddress] = useState("");
    const [validUntil, setValidUntil] = useState("");

    const [status, setStatus] = useState("");
    const [isIssuing, setIsIssuing] = useState(false);
    const [resultLink, setResultLink] = useState("");

    // Set default selection once templates load
    useEffect(() => {
        if (activeTemplates.length > 0 && !selectedTypeId) {
            setSelectedTypeId(activeTemplates[0].id);
        }
    }, [activeTemplates, selectedTypeId]);

    const handleInputChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const getSignedUrl = async () => {
        const req = await fetch("/api/url");
        const res = await req.json();
        return res.url;
    };

    // ... (Guard Clauses Omitted for brevity, unchanged) ...
    // Guard Clauses
    if (loadingTemplates || loadingRole) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isConnected) {
        return (
            <main className="w-full h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
                <div className="bg-primary/5 p-8 rounded-full mb-6">
                    <UploadCloud className="h-16 w-16 text-primary" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-3">Issuer Access Required</h1>
                <p className="text-muted-foreground max-w-md mb-8">
                    Connect your wallet to verify issuer status and issue credentials.
                </p>
            </main>
        );
    }

    if (!isIssuer) {
        return (
            <main className="w-full h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
                <div className="bg-destructive/10 p-8 rounded-full mb-6">
                    <AlertTriangle className="h-16 w-16 text-destructive" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-3 text-destructive">Access Denied</h1>
                <p className="text-muted-foreground max-w-md mb-4">
                    Your address <code className="bg-muted px-1 py-0.5 rounded text-xs">{issuerAddress}</code> is not an authorized issuer.
                </p>
                <Button asChild variant="outline">
                    <Link href="/dashboard">Return to Dashboard</Link>
                </Button>
            </main>
        );
    }

    if (!selectedType) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-muted-foreground">No credential templates found. Please contact an admin.</p>
            </div>
        );
    }

    const handleIssue = async () => {
        // Check Network
        if (chainId !== 31337) {
            if (switchChain) {
                // Try switch, if fails prompt user
                try {
                    switchChain({ chainId: 31337 });
                    return;
                } catch (e) { /* ignore */ }
            }
            alert("Please switch your wallet network to Localhost 8545 manually.");
            return;
        }

        if (!file) return alert("Please select a file.");
        if (!receiverAddress || !isAddress(receiverAddress)) return alert("Please enter a valid Ethereum Receiver Address.");

        const missingFields = selectedType.fields.filter(f => !formData[f.key]);
        if (missingFields.length > 0) {
            return alert(`Missing fields: ${missingFields.map(f => f.label).join(", ")}`);
        }

        try {
            setIsIssuing(true);
            setStatus("Preparing metadata & ZKP...");

            let commitment = "0x0000000000000000000000000000000000000000000000000000000000000000";
            let zkpData = null;

            // ZKP Logic
            if (formData["birthdate"]) {
                setStatus("Generating ZK Commitment...");
                const salt = generateSalt();
                const birthdateTimestamp = Math.floor(new Date(formData["birthdate"]).getTime() / 1000);

                const comm = await generateCommitment(birthdateTimestamp, salt);
                commitment = `0x${BigInt(comm).toString(16).padStart(64, '0')}`; // Convert to hex32

                zkpData = {
                    salt: salt,
                    birthdate: birthdateTimestamp
                };
            }

            setStatus("Encrypting bundle...");

            // 1. Prepare Metadata
            const metadata = {
                typeId: selectedType.id,
                typeName: selectedType.label,
                issuedAt: new Date().toISOString(),
                description: `Issued by ${issuerAddress}`,
                validUntil: validUntil || null,
                zkp: zkpData,
                ...formData
            };

            // 2. Encrypt Bundle
            const { encryptedBlob, keyStr, ivStr } = await encryptBundle(file, metadata);

            // 3. Upload to IPFS
            setStatus("Uploading encrypted bundle to IPFS...");
            const uploadUrl = await getSignedUrl();
            const upload = await pinata.upload.public
                .file(new File([encryptedBlob], "credential.enc"))
                .url(uploadUrl);

            // 4. Write to Smart Contract
            setStatus("Waiting for wallet signature...");
            const validUntilTimestamp = validUntil ? BigInt(Math.floor(new Date(validUntil).getTime() / 1000)) : BigInt(0);

            // Pass commitment to contract
            const txResult = await issueCredential(receiverAddress as `0x${string}`, upload.cid, validUntilTimestamp, commitment as `0x${string}`);

            if (!txResult.ok || !txResult.data) {
                throw new Error(txResult.error || "Transaction failed");
            }

            const credId = txResult.data;
            setStatus("Saving to database...");

            // 5. Store in Supabase
            const { error: dbError } = await supabase
                .from("user_credentials")
                .insert({
                    receiver_address: receiverAddress,
                    ipfs_cid: upload.cid,
                    cred_id: credId,
                    encryption_key: keyStr,
                    iv: ivStr,
                    metadata: metadata
                });

            if (dbError) throw new Error("Database Error: " + dbError.message);

            // 6. Generate Link
            const link = `${window.location.origin}/view/${upload.cid}?id=${credId}#key=${encodeURIComponent(keyStr)}&iv=${encodeURIComponent(ivStr)}`;
            setResultLink(link);
            setStatus("Success! Credential Issued.");

        } catch (e) {
            console.error(e);
            setStatus("Error: " + (e as Error).message);
        } finally {
            setIsIssuing(false);
        }
    };

    return (
        <main className="container mx-auto px-4 py-8 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-8 text-center">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Issue Credential</h1>
                <p className="text-muted-foreground">Fill in the details below to issue a verifiable credential.</p>
            </header>

            <Card className="border-primary/10 shadow-lg">
                <CardHeader className="bg-muted/30 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Credential Details
                    </CardTitle>
                    <CardDescription>
                        All data will be encrypted and stored on IPFS.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    {/* Credential Type Selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Credential Type
                        </label>
                        <div className="relative">
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                value={selectedTypeId}
                                onChange={(e) => {
                                    setSelectedTypeId(e.target.value);
                                    setFormData({});
                                }}
                            >
                                {activeTemplates.map(type => (
                                    <option key={type.id} value={type.id}>{type.label}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Receiver Address */}
                        <div className="space-y-2 sm:col-span-2">
                            <label className="text-sm font-medium leading-none">Receiver Address (0x...)</label>
                            <Input
                                placeholder="0x..."
                                className="font-mono"
                                value={receiverAddress}
                                onChange={e => setReceiverAddress(e.target.value)}
                            />
                        </div>

                        {/* Validity Date */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">Valid Until (Optional)</label>
                            <Input
                                type="date"
                                value={validUntil}
                                onChange={e => setValidUntil(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Template Fields</span>
                        </div>
                    </div>

                    {/* Dynamic Fields */}
                    <div className="space-y-4">
                        {selectedType.fields.map(field => (
                            <div key={field.key} className="space-y-2">
                                <label className="text-sm font-medium leading-none">{field.label}</label>
                                <Input
                                    type={field.type}
                                    placeholder={field.placeholder}
                                    value={formData[field.key] || ""}
                                    onChange={e => handleInputChange(field.key, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Privacy Features</span>
                        </div>
                    </div>

                    {/* ZKP Birthdate Input */}
                    <div className="space-y-2 rounded-lg border p-4 bg-muted/20">
                        <label className="text-sm font-medium leading-none flex items-center gap-2">
                            Birthday (Zero-Knowledge Proof)
                            <Badge variant="outline" className="text-[10px] h-5">Optional</Badge>
                        </label>
                        <p className="text-xs text-muted-foreground">
                            If provided, the holder can prove they are 18+ without revealing the exact date.
                        </p>
                        <Input
                            type="date"
                            value={formData["birthdate"] || ""}
                            onChange={e => handleInputChange("birthdate", e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Attachment</span>
                        </div>
                    </div>

                    {/* File Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Credential File (PDF/Image)</label>
                        <Input
                            type="file"
                            accept="application/pdf,image/*"
                            className="cursor-pointer file:bg-primary/10 file:text-primary file:border-0 file:rounded-md file:mr-4 file:px-2 file:py-0.5"
                            onChange={(e) => setFile(e.target?.files?.[0])}
                        />
                    </div>

                </CardContent>
                <CardFooter className="flex flex-col gap-4 bg-muted/10 pt-6">
                    <Button
                        className="w-full h-11 text-base"
                        onClick={handleIssue}
                        disabled={isIssuing || !file}
                    >
                        {isIssuing ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                {status || "Processing..."}
                            </>
                        ) : (
                            "Issue Credential"
                        )}
                    </Button>

                    {resultLink && (
                        <div className="w-full p-4 rounded-lg bg-green-500/10 border border-green-500/20 animate-in zoom-in-50 duration-300">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                <span className="font-bold text-green-700 dark:text-green-300">Successfully Issued!</span>
                            </div>
                            <div className="bg-background/50 p-2 rounded text-xs font-mono break-all border border-border/50 select-all">
                                {resultLink}
                            </div>
                            <Button
                                variant="link"
                                className="h-auto p-0 mt-2 text-green-600 dark:text-green-400"
                                onClick={() => window.open(resultLink, '_blank')}
                            >
                                Open Link <ExternalLink className="ml-1 h-3 w-3" />
                            </Button>
                        </div>
                    )}

                    {!resultLink && status && !isIssuing && (
                        <p className="text-sm text-destructive text-center w-full">{status}</p>
                    )}
                </CardFooter>
            </Card>
        </main>
    );
}