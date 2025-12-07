"use client";

import { useEffect, useState, use } from "react";
// import { pinata } from "@/utils/config";
import { decryptBundle } from "@/utils/bundleEncryption";
import { useTemplates } from "@/hooks/useTemplates";
import { CredentialType } from "@/utils/credentialTemplates";

interface CredentialData {
    metadata: Record<string, any>;
    fileBlob: Blob;
    fileDetails: {
        name: string;
        type: string;
    };
}

export default function ViewPage({ params }: { params: Promise<{ cid: string }> }) {
    // Params needing to be unwrapped
    const { cid } = use(params);
    const { templates } = useTemplates(); // Fetch all templates (even deprecated)

    const [status, setStatus] = useState("Initializing...");
    const [data, setData] = useState<CredentialData | null>(null);
    const [fileUrl, setFileUrl] = useState<string>("");

    useEffect(() => {
        const loadCredential = async () => {
            try {
                // 1. Parse Hash params for Key and IV
                // Format: #key=...&iv=...
                const hash = window.location.hash.substring(1); // remove #
                const params = new URLSearchParams(hash);
                const keyStr = params.get("key");
                const ivStr = params.get("iv");

                if (!cid || !keyStr || !ivStr) {
                    setStatus("Error: Missing Link Parameters (CID, Key, or IV)");
                    return;
                }

                // 2. Fetch Encrypted Bundle from IPFS
                setStatus("Fetching Credential...");
                // Use local proxy to avoid CORS
                const gatewayUrl = `/api/ipfs/${cid}`;
                const res = await fetch(gatewayUrl);
                if (!res.ok) throw new Error("Failed to fetch from IPFS");
                const encryptedBlob = await res.blob();

                // 3. Decrypt
                setStatus("Decrypting...");
                const result = await decryptBundle(encryptedBlob, keyStr, ivStr);

                // 4. Set Data
                setData(result);
                const url = URL.createObjectURL(result.fileBlob);
                setFileUrl(url);
                setStatus("");

            } catch (e) {
                console.error(e);
                setStatus("Error: " + (e as Error).message);
            }
        };

        loadCredential();
    }, [cid]);

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
        // Try to find in the specific type if known
        const typeId = data.metadata.typeId;
        if (typeId) {
            const template = templates.find(t => t.id === typeId);
            const field = template?.fields.find(f => f.key === key);
            if (field) return field.label;
        }
        // Fallback: capitalize
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    };

    // Filter out keys we want to show separately or hide
    const hiddenKeys = ["typeId", "typeName", "issuedAt", "description"]; // Example excludes
    // We can also allow 'description' to show if it exists.

    // keys to render in the generic list
    const displayKeys = Object.keys(data.metadata).filter(k => !hiddenKeys.includes(k));

    return (
        <main className="w-full min-h-screen p-6 bg-gray-50 flex flex-col items-center">
            {/* Verification Badge */}
            <div className="bg-green-100 text-green-800 px-6 py-2 rounded-full font-bold mb-8 flex items-center gap-2 shadow-sm">
                <span>✅</span> Verified Credential
            </div>

            <div className="flex flex-col lg:flex-row w-full max-w-6xl gap-6">

                {/* 1. Metadata Card */}
                <div className="w-full lg:w-1/3 bg-white p-6 rounded-xl shadow-lg h-fit">
                    <h2 className="text-xl font-bold mb-2 border-b pb-2">
                        {data.metadata.typeName || "Credential Details"}
                    </h2>

                    <div className="flex flex-col gap-4 mt-4">

                        {/* Render Issued Date if present */}
                        {data.metadata.issuedAt && (
                            <div>
                                <label className="text-xs text-gray-400 uppercase font-semibold">Issued Date</label>
                                <p className="text-gray-600">{new Date(data.metadata.issuedAt).toLocaleDateString()}</p>
                            </div>
                        )}

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
