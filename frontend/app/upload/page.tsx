"use client";

import { useState, useEffect } from "react";
import { pinata } from "@/utils/config";
import { encryptBundle } from "@/utils/bundleEncryption";
import { useTemplates } from "@/hooks/useTemplates";
import { isAddress } from "viem";

import { supabase } from "@/utils/supabaseClient";
import { issueCredential } from "@/lib/contract";
import { useWallet } from "@/lib/wallet";

export default function IssuePage() {
    const { activeTemplates, loading } = useTemplates();
    const [file, setFile] = useState<File>();

    // Wallet & Contract
    const { address: issuerAddress, isConnected, chainId, connectWallet, switchChain } = useWallet();


    // Type Selection
    const [selectedTypeId, setSelectedTypeId] = useState("");
    const selectedType = activeTemplates.find(t => t.id === selectedTypeId);

    // Dynamic Form State
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [receiverAddress, setReceiverAddress] = useState("");

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
        if (!isConnected || !issuerAddress) {
            connectWallet();
            return;
        }

        // Check Network
        if (chainId !== 31337) {
            const confirmed = window.confirm("You are on the wrong network. Switch to Hardhat Localhost?");
            if (confirmed && switchChain) {
                switchChain({ chainId: 31337 });
                return;
            } else if (!switchChain) {
                alert("Please switch your wallet network to Localhost 8545 manually.");
                return;
            }
        }

        if (!file) return alert("Please select a file.");
        if (!receiverAddress || !isAddress(receiverAddress)) return alert("Please enter a valid Ethereum Receiver Address.");

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
                description: `Issued by ${issuerAddress}`,
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

            // 4. Write to Smart Contract
            setStatus("Waiting for Wallet Signature...");
            const txResult = await issueCredential(receiverAddress as `0x${string}`, upload.cid);

            if (!txResult.ok || !txResult.data) {
                throw new Error(txResult.error || "Transaction failed");
            }

            const txHash = txResult.data;

            setStatus(`Transaction Sent! Hash: ${txHash}. Saving to Database...`);

            // 5. Store in Supabase
            const { error: dbError } = await supabase
                .from("user_credentials")
                .insert({
                    receiver_address: receiverAddress,
                    ipfs_cid: upload.cid,
                    encryption_key: keyStr,
                    iv: ivStr,
                    metadata: metadata
                });

            if (dbError) throw new Error("Database Error: " + dbError.message);

            // 6. Generate Magic Link (Optional, mostly for immediate sharing)
            const link = `${window.location.origin}/view/${upload.cid}#key=${encodeURIComponent(keyStr)}&iv=${encodeURIComponent(ivStr)}`;

            setResultLink(link);
            setStatus("Success! Credential Issued & Recorded on Blockchain.");

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

                    {/* 0. Wallet Connection */}
                    <div className="flex justify-between items-center bg-blue-50 p-3 rounded border border-blue-100 mb-2">
                        <span className="text-sm text-blue-800">
                            {isConnected ? `Issuer: ${issuerAddress?.slice(0, 6)}...${issuerAddress?.slice(-4)}` : "Wallet Not Connected"}
                        </span>
                        {!isConnected && (
                            <button
                                onClick={connectWallet}
                                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                            >
                                Connect Wallet
                            </button>
                        )}
                    </div>

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

                    {/* 2. Receiver Address */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Receiver ETH Address</label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-500 font-mono text-sm"
                            placeholder="0x..."
                            value={receiverAddress}
                            onChange={e => setReceiverAddress(e.target.value)}
                        />
                    </div>

                    {/* 3. Dynamic Fields */}
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

                    {/* 4. File Input */}
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
                        disabled={!file || !isConnected}
                    >
                        {isConnected ? "Encrypt, Upload & Issue" : "Connect Wallet to Issue"}
                    </button>
                </div>

                {/* Status & Result */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600 mb-2">{status}</p>

                    {resultLink && (
                        <div className="bg-green-50 border border-green-200 p-4 rounded text-left break-all">
                            <p className="text-sm text-green-800 font-bold mb-1">Credential Deployed!</p>
                            <p className="text-xs text-gray-600 mb-2">Direct Link (for testing):</p>
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