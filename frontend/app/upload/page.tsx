"use client";

import { useState, useEffect } from "react";
import { pinata } from "@/utils/config";
import { encryptBundle } from "@/utils/bundleEncryption";
import { useTemplates } from "@/hooks/useTemplates";

export default function IssuePage() {
    const { activeTemplates, loading } = useTemplates();
    const [file, setFile] = useState<File>();

    // Type Selection
    const [selectedTypeId, setSelectedTypeId] = useState("");
    const selectedType = activeTemplates.find(t => t.id === selectedTypeId);

    // Dynamic Form State
    const [formData, setFormData] = useState<Record<string, string>>({});

    const [status, setStatus] = useState("");
    const [resultLink, setResultLink] = useState("");

    // Set default selection once templates load
    useEffect(() => {
        if (activeTemplates.length > 0 && !selectedTypeId) {
            setSelectedTypeId(activeTemplates[0].id);
        }
    }, [activeTemplates, selectedTypeId]);

    const handleInputChange = (key: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const getSignedUrl = async () => {
        const req = await fetch("/api/url");
        const res = await req.json();
        return res.url;
    };

    // Loading Guard
    if (loading) return <p className="text-center mt-20">Loading Templates...</p>;
    if (!selectedType) return <p className="text-center mt-20">No Templates Found. Please add one in Admin Panel.</p>;

    const handleIssue = async () => {
        if (!file) return alert("Please select a file.");

        // Simple validation: check if all required fields are filled
        const missingFields = selectedType.fields.filter(f => !formData[f.key]);
        if (missingFields.length > 0) {
            return alert(`Missing fields: ${missingFields.map(f => f.label).join(", ")}`);
        }

        try {
            setStatus("Preparing and Encrypting Bundle...");

            // 1. Prepare Metadata
            const metadata = {
                typeId: selectedType.id,
                typeName: selectedType.label,
                issuedAt: new Date().toISOString(),
                ...formData // Spread dynamic fields
            };

            // 2. Encrypt Bundle (File + Metadata)
            const { encryptedBlob, keyStr, ivStr } = await encryptBundle(file, metadata);

            // 3. Upload to IPFS
            setStatus("Uploading to IPFS...");
            const uploadUrl = await getSignedUrl();
            const upload = await pinata.upload.public
                .file(new File([encryptedBlob], "credential.enc"))
                .url(uploadUrl);

            console.log("Uploaded CID:", upload.cid);

            // 4. Generate Magic Link
            // Format: /view/[CID]#key=...&iv=...
            const link = `${window.location.origin}/view/${upload.cid}#key=${encodeURIComponent(keyStr)}&iv=${encodeURIComponent(ivStr)}`;

            setResultLink(link);
            setStatus("Success! Credential Issued.");

        } catch (e) {
            console.error(e);
            setStatus("Error: " + (e as Error).message);
        }
    };

    return (
        <main className="w-full min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
                <h1 className="text-2xl font-bold mb-6 text-gray-800 text-center">Issue Secure Credential</h1>

                <div className="flex flex-col gap-4">

                    {/* 1. Credential Type Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Credential Type</label>
                        <select
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 bg-white text-gray-500"
                            value={selectedTypeId}
                            onChange={(e) => {
                                setSelectedTypeId(e.target.value);
                                setFormData({}); // Reset form on type change
                            }}
                        >
                            {activeTemplates.map(type => (
                                <option key={type.id} value={type.id}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    <hr className="border-gray-100 my-2 " />

                    {/* 2. Dynamic Fields */}
                    {selectedType.fields.map(field => (
                        <div key={field.key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                            <input
                                type={field.type}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-500"
                                placeholder={field.placeholder}
                                value={formData[field.key] || ""}
                                onChange={e => handleInputChange(field.key, e.target.value)}
                            />
                        </div>
                    ))}

                    <hr className="border-gray-100 my-2" />

                    {/* 3. File Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Credential File (PDF/Image)</label>
                        <input
                            type="file"
                            accept="application/pdf,image/*"
                            className="w-full border p-2 rounded bg-gray-50 text-gray-500"
                            onChange={(e) => setFile(e.target?.files?.[0])}
                        />
                    </div>

                    {/* Action */}
                    <button
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded mt-2 transition-colors disabled:opacity-50"
                        onClick={handleIssue}
                        disabled={!file}
                    >
                        Encrypt & Issue
                    </button>
                </div>

                {/* Status & Result */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600 mb-2">{status}</p>

                    {resultLink && (
                        <div className="bg-green-50 border border-green-200 p-4 rounded text-left break-all">
                            <p className="text-sm text-green-800 font-bold mb-1">Credential Link (Share this with the student):</p>
                            <a href={resultLink} target="_blank" className="text-blue-600 text-sm hover:underline">
                                {resultLink}
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}