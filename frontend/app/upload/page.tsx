"use client";

import { useState } from "react";
import { pinata } from "@/utils/config";
import { encryptBundle } from "@/utils/bundleEncryption";

export default function IssuePage() {
    const [file, setFile] = useState<File>();
    // Metadata State
    const [studentName, setStudentName] = useState("");
    const [studentID, setStudentID] = useState("");
    const [description, setDescription] = useState("");

    const [status, setStatus] = useState("");
    const [resultLink, setResultLink] = useState("");

    const getSignedUrl = async () => {
        const req = await fetch("/api/url");
        const res = await req.json();
        return res.url;
    };

    const handleIssue = async () => {
        if (!file) return alert("Please select a file.");
        if (!studentName || !studentID) return alert("Please fill in student details.");

        try {
            setStatus("Preparing and Encrypting Bundle...");

            // 1. Prepare Metadata which will be hidden inside the encryption
            const metadata = {
                studentName,
                studentID,
                description,
                issuedAt: new Date().toISOString()
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
                    {/* Metadata Inputs */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. John Doe"
                            value={studentName}
                            onChange={e => setStudentName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. 123456"
                            value={studentID}
                            onChange={e => setStudentID(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description / Course</label>
                        <textarea
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. Bachelor of Science in Computer Science"
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    {/* File Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Credential File (PDF/Image)</label>
                        <input
                            type="file"
                            accept="application/pdf,image/*"
                            className="w-full border p-2 rounded bg-gray-50"
                            onChange={(e) => setFile(e.target?.files?.[0])}
                        />
                    </div>

                    {/* Action */}
                    <button
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded mt-2 transition-colors disabled:opacity-50"
                        onClick={handleIssue}
                        disabled={!file || !studentName}
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