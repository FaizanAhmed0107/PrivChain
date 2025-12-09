"use client";

import { useSearchParams } from "next/navigation";
import { getCredentialDetails } from "@/lib/contract";
import { useEffect, useState, use } from "react";
import { decryptBundle } from "@/utils/bundleEncryption";
import { useTemplates } from "@/hooks/useTemplates";
import { useWallet } from "@/lib/wallet";
import { revokeCredential } from "@/lib/contract";


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
    const { address: userAddress, isConnected } = useWallet();

    const { templates } = useTemplates();

    const [status, setStatus] = useState("Initializing...");
    const [data, setData] = useState<CredentialData | null>(null);
    const [fileUrl, setFileUrl] = useState<string>("");
    const [isRevoked, setIsRevoked] = useState(false); // Default to true (Revoked Credential) until checked
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
                    setStatus("Error: Missing Credential ID");
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


                // 2. Parse Hash params for Key and IV (from URL)
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);
                const keyStr = params.get("key");
                const ivStr = params.get("iv");

                if (!keyStr || !ivStr) {
                    setStatus("Error: Missing Encryption Keys in Link.");
                    return;
                }

                // 3. Fetch Encrypted Bundle from IPFS (using hash from contract)
                setStatus("Fetching Encrypted Data from IPFS...");
                const gatewayUrl = `/api/ipfs/${ipfsHash}`;
                const res = await fetch(gatewayUrl);
                if (!res.ok) throw new Error("Failed to fetch from IPFS");
                const encryptedBlob = await res.blob();

                // 4. Decrypt
                setStatus("Decrypting...");
                const result = await decryptBundle(encryptedBlob, keyStr, ivStr);

                // 5. Set Data
                setData(result);
                const url = URL.createObjectURL(result.fileBlob);
                setFileUrl(url);
                setStatus("");

            } catch (e) {
                console.error(e);
                setStatus("Error: " + (e as Error).message);
            }
        };

        if (credId) {
            loadCredential();
        }
    }, [credId]);

    if (status) {
        return (
            <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-600 animate-pulse">{status}</p>
            </div>
        );
    }

    if (!data) return null;

    // Helper: Find Label for key if it exists in templates, otherwise beautify key
    const getFieldLabel = (key: string) => {
        // ... (keep existing helper matches)
        const typeId = data.metadata.typeId;
        if (typeId) {
            const template = templates.find(t => t.id === typeId);
            const field = template?.fields.find(f => f.key === key);
            if (field) return field.label;
        }
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    };

    const hiddenKeys = ["typeId", "typeName", "issuedAt", "description", "validUntil"];
    const displayKeys = Object.keys(data.metadata).filter(k => !hiddenKeys.includes(k));

    return (
        <main className="w-full min-h-screen p-6 bg-gray-50 flex flex-col items-center">
            {/* Verification Badge */}
            <div className={`px-6 py-2 rounded-full font-bold mb-8 flex items-center gap-2 shadow-sm ${verificationStatus === "valid" ? "bg-green-100 text-green-800" :
                verificationStatus === "revoked" ? "bg-red-100 text-red-800" :
                    "bg-yellow-100 text-yellow-800"
                }`}>
                <span>{verificationStatus === "valid" ? "✅" : "⚠️"}</span>
                {verificationStatus === "valid" ? "Verified Credential" :
                    verificationStatus === "revoked" ? "Revoked Credential" :
                        verificationStatus === "expired" ? "Expired Credential" : "Verification Failed"}
            </div>

            <div className="flex flex-col lg:flex-row w-full max-w-6xl gap-6">

                {/* 1. Metadata Card */}
                <div className="w-full lg:w-1/3 bg-white p-6 rounded-xl shadow-lg h-fit">
                    <h2 className="text-xl font-bold mb-2 border-b pb-2 flex justify-between items-center">
                        <span>{data.metadata.typeName || "Credential Details"}</span>

                        {/* Revoke Button for Issuer */}
                        {isConnected && userAddress && issuer && userAddress.toLowerCase() === issuer.toLowerCase() && !isRevoked && (
                            <button
                                onClick={handleRevoke}
                                disabled={revoking}
                                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded border border-red-200 transition-colors"
                            >
                                {revoking ? "Revoking..." : "Revoke Credential"}
                            </button>
                        )}
                    </h2>

                    <div className="flex flex-col gap-4 mt-4">

                        {/* Render Issued Date if present */}
                        {data.metadata.issuedAt && (
                            <div>
                                <label className="text-xs text-gray-400 uppercase font-semibold">Issued Date</label>
                                <p className="text-gray-600">{new Date(data.metadata.issuedAt).toLocaleDateString()}</p>
                            </div>
                        )}

                        {/* Render Valid Until if present and > 0 */}
                        {data.metadata.validUntil && data.metadata.validUntil !== "0" && (
                            <div>
                                <label className="text-xs text-gray-400 uppercase font-semibold">Valid Until</label>
                                <p className="text-gray-600">{new Date(data.metadata.validUntil).toLocaleDateString()}</p>
                            </div>
                        )}

                        {/* Issuer & Holder */}
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-semibold">Issuer</label>
                            <p className="text-sm font-mono text-gray-600 break-all">{issuer}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-semibold">Holder</label>
                            <p className="text-sm font-mono text-gray-600 break-all">{holder}</p>
                        </div>

                        {/* Render Dynamic Keys */}
                        {displayKeys.map(key => (
                            <div key={key}>
                                <label className="text-xs text-gray-400 uppercase font-semibold">{getFieldLabel(key)}</label>
                                <p className="text-lg font-medium text-gray-800">{data.metadata[key]}</p>
                            </div>
                        ))}

                    </div>
                </div>

                {/* 2. File Viewer */}
                <div className="w-full lg:w-2/3 bg-gray-200 rounded-xl min-h-[600px] flex items-center justify-center overflow-hidden shadow-inner border border-gray-300">
                    {data.fileDetails.type.includes("pdf") ? (
                        <iframe src={fileUrl} className="w-full h-[800px]" />
                    ) : (
                        <img src={fileUrl} alt="Credential" className="max-w-full max-h-full object-contain" />
                    )}
                </div>

            </div>
        </main>
    );
}
