"use client";

import { useState, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, CheckCircle, XCircle, Scan, Keyboard, Loader2 } from "lucide-react";
import { verifyAge } from "@/lib/contract";
import { cn } from "@/lib/utils";

export default function VerifyPage() {
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("scan");
    const [manualInput, setManualInput] = useState("");
    const [status, setStatus] = useState<"idle" | "verifying" | "valid" | "invalid" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [proofDescription, setProofDescription] = useState<string>("");
    const [verifiedAttributes, setVerifiedAttributes] = useState<{ l: string, v: string }[]>([]);

    // Initialize Scanner when "scan" tab is active
    useEffect(() => {
        if (activeTab !== "scan" || status !== "idle") return;

        // Slight delay to ensure DOM is ready
        const timer = setTimeout(() => {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );

            scanner.render((decodedText) => {
                handleScanSuccess(decodedText);
                scanner.clear();
            }, (error) => {
                // console.warn(error);
            });

            return () => {
                try { scanner.clear(); } catch (e) { }
            };
        }, 100);

        return () => clearTimeout(timer);
    }, [activeTab, status]);

    const handleScanSuccess = (decodedText: string) => {
        setScanResult(decodedText);
        verifyProof(decodedText);
    };

    const handleManualVerify = () => {
        if (!manualInput) return;
        verifyProof(manualInput);
    };

    const verifyProof = async (jsonString: string) => {
        try {
            setStatus("verifying");
            const data = JSON.parse(jsonString);

            // Expected Format: { pid: "...", p: { pA, pB, pC, publicSignals }, c: "full_id", d: "desc" }
            if (!data.p || !data.c) throw new Error("Invalid QR Data Format");

            const { pA, pB, pC, publicSignals } = data.p;
            const credId = data.c;

            // Set dynamic description if available
            if (data.d) setProofDescription(data.d);
            else setProofDescription("Age Requirement (18+)"); // Fallback

            // Call Smart Contract to Verify
            const res = await verifyAge(credId, pA, pB, pC, publicSignals);

            if (res.ok && res.isValid) {
                setStatus("valid");
                if (data.a && Array.isArray(data.a)) {
                    setVerifiedAttributes(data.a);
                } else if (data.n) {
                    // Backwards compatibility or single field fallback
                    setVerifiedAttributes([data.n]);
                } else {
                    setVerifiedAttributes([]);
                }
            } else {
                setStatus("invalid");
                setErrorMsg("Proof verification failed on-chain.");
            }

        } catch (e) {
            console.error(e);
            setStatus("error");
            setErrorMsg((e as Error).message);
        }
    };

    const reset = () => {
        setStatus("idle");
        setScanResult(null);
        setErrorMsg("");
        setProofDescription("");
        setVerifiedAttributes([]);
        setActiveTab("scan");
        // No reload needed now, state change triggers effect
    };

    return (
        <main className="container mx-auto px-4 py-8 max-w-lg min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="mb-8 text-center">
                <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
                <h1 className="text-3xl font-bold tracking-tight mb-2">Verify Credential</h1>
                <p className="text-muted-foreground">Scan a user's ZK Proof QR code to verify their age.</p>
            </div>

            <Card className="w-full shadow-lg border-primary/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Scan className="w-5 h-5" /> Verification Scanner
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {status === "idle" && (
                        <div className="space-y-6">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="scan">Scan QR</TabsTrigger>
                                    <TabsTrigger value="manual">Manual Input</TabsTrigger>
                                </TabsList>
                                <TabsContent value="scan" className="mt-4">
                                    <div id="reader" className="w-full min-h-[350px] rounded-lg overflow-hidden border bg-black/5" />
                                </TabsContent>
                                <TabsContent value="manual" className="mt-4 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Paste Proof Data (JSON)</label>
                                        <Input
                                            placeholder='{"p": ...}'
                                            value={manualInput}
                                            onChange={(e) => setManualInput(e.target.value)}
                                            className="font-mono text-xs"
                                        />
                                    </div>
                                    <Button onClick={handleManualVerify} className="w-full">
                                        Verify Proof
                                    </Button>
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}

                    {status === "verifying" && (
                        <div className="py-12 flex flex-col items-center text-center space-y-4">
                            <Loader2 className="w-12 h-12 animate-spin text-primary" />
                            <p className="font-semibold animate-pulse">Verifying On-Chain...</p>
                        </div>
                    )}

                    {status === "valid" && (
                        <div className="py-8 flex flex-col items-center text-center space-y-4 animate-in zoom-in-50">
                            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
                                <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">Verified Valid!</h2>
                            <div className="bg-secondary/50 px-4 py-2 rounded-lg border border-border">
                                <p className="text-sm font-medium text-foreground">{proofDescription}</p>
                                {verifiedAttributes.length > 0 && (
                                    <div className="mt-2 border-t border-border/50 pt-2 space-y-1">
                                        {verifiedAttributes.map((attr, idx) => (
                                            <p key={idx} className="text-sm">
                                                <span className="text-muted-foreground">{attr.l}: </span>
                                                <span className="font-bold text-primary">{attr.v}</span>
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <p className="text-muted-foreground text-sm">
                                The proof is mathematically valid and the credential exists on-chain.
                            </p>
                            <Button onClick={reset} variant="outline" className="mt-4">Verify Another</Button>
                        </div>
                    )}

                    {(status === "invalid" || status === "error") && (
                        <div className="py-8 flex flex-col items-center text-center space-y-4 animate-in zoom-in-50">
                            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-2">
                                <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-red-700 dark:text-red-400">Verification Failed</h2>
                            <p className="text-muted-foreground max-w-xs mx-auto">
                                {errorMsg || "The proof provided is invalid or expired."}
                            </p>
                            <Button onClick={reset} variant="outline" className="mt-4">Try Again</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
