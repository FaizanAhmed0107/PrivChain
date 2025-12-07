
import { Buffer } from "buffer";

// 1. Generate a random AES-256 key
export async function generateAESKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

// Helper: Export Key to Base64 String
export async function exportKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("raw", key);
    return Buffer.from(exported).toString("base64");
}

// Helper: Import Key from Base64 String
export async function importKey(keyStr: string): Promise<CryptoKey> {
    const keyBuffer = Buffer.from(keyStr, "base64");
    return await window.crypto.subtle.importKey(
        "raw",
        keyBuffer,
        "AES-GCM",
        true,
        ["encrypt", "decrypt"]
    );
}

// 2. Encrypt Bundle (File + Metadata)
export async function encryptBundle(file: File, metadata: Record<string, any>) {
    // a. Read file as Base64
    const fileBuffer = await file.arrayBuffer();
    const fileBase64 = Buffer.from(fileBuffer).toString("base64");

    // b. Create the bundle object
    const bundle = {
        meta: metadata,
        file: {
            name: file.name,
            type: file.type,
            data: fileBase64
        }
    };

    // c. Stringify
    const bundleString = JSON.stringify(bundle);
    const bundleBytes = new TextEncoder().encode(bundleString);

    // d. Generate Key & Encrypt
    const key = await generateAESKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedContent = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        bundleBytes
    );

    // e. Return all needed parts
    return {
        encryptedBlob: new Blob([encryptedContent]),
        keyStr: await exportKey(key),
        ivStr: Buffer.from(iv).toString("hex")
    };
}

// 3. Decrypt Bundle
export async function decryptBundle(encryptedBlob: Blob, keyStr: string, ivStr: string) {
    // a. Import Key
    const key = await importKey(keyStr);

    // b. Decrypt
    const iv = new Uint8Array(Buffer.from(ivStr, "hex"));
    const buffer = await encryptedBlob.arrayBuffer();

    const decryptedContent = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        buffer
    );

    // c. Parse JSON
    const decryptedString = new TextDecoder().decode(decryptedContent);
    const bundle = JSON.parse(decryptedString);

    // d. Reconstruct File Blob (optional, helpful for UI)
    const fileBytes = Buffer.from(bundle.file.data, "base64");
    const fileBlob = new Blob([fileBytes], { type: bundle.file.type });

    return {
        metadata: bundle.meta,
        fileDetails: bundle.file, // contains name, type (no data to save memory if wanted)
        fileBlob: fileBlob
    };
}
