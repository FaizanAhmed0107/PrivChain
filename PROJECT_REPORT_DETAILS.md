# Project Report: Secure Decentralized Credential Registry ("zk-credential-app")

## 1. Executive Summary

### 1.1 Project Overview
The **ZK Credential App** is a decentralized, privacy-preserving platform for issuing, storing, and verifying academic and professional credentials. It leverages **Blockchain technology** for immutable trust, **IPFS (InterPlanetary File System)** for decentralized storage, and **industry-standard encryption (AES-GCM)** to ensure data privacy. The system empowers institutions to issue verifiable digital certificates while giving holders complete ownership and control over their data, eliminating the reliance on centralized authorities for verification.

### 1.2 Objectives
- **Immutable Trust**: Ensure credentials cannot be forged or altered once issued.
- **Decentralized Ownership**: Credential holders own their data in their digital wallets, not a central server.
- **High Availability**: Use distributed storage (IPFS) to prevent data loss or server downtime.
- **Privacy & Security**: Encrypt credentials so only the intended verifiers can view the content.
- **Revocability**: Allow issuers to revoke credentials in case of errors or malpractice.

---

## 2. Conventional Problems & Solutions

The project addresses several critical flaws in traditional credential management systems:

| # | Conventional Problem | The Proposed Solution |
|---|----------------------|-----------------------|
| 1 | **Centralization Risks**<br>Traditional databases are single points of failure. If a university's server goes down or is hacked, records are inaccessible or compromised. | **Decentralization (Blockchain + IPFS)**<br>Records are distributed across the blockchain (ledger) and IPFS (storage network). No single entity controls the data availability, ensuring records are permanent and unstoppable. |
| 2 | **Credential Fraud**<br>Paper certificates and simple PDFs are easily forged using Photoshop. Verification requires slow, manual phone calls or emails to institutions. | **Cryptographic Proof**<br>Every credential is digitally signed by the issuer's wallet on the blockchain. Verifiers can instantly check the cryptographic signature and validity against the smart contract—no phone calls needed. |
| 3 | **Lack of Ownership**<br>Graduates do not "own" their degree records; the university does. Requesting transcripts often costs money and takes time. | **Self-Sovereign Identity**<br>The credential is minted to the user's wallet address. They possess the decryption keys and the proof of ownership, granting them autonomous control over sharing their achievements. |
| 4 | **Revocation Difficulties**<br>Revoking a physical certificate is impossible. Revoking a digital one in a centralized DB doesn't prevent copies from circulating. | **On-Chain Revocation**<br>The smart contract maintains a "Revoked" status. Even if a user has the old file, any verification attempt checks the live blockchain status, which will flag the credential as invalid immediately. |

---

## 3. Technical Architecture

### 3.1 High-Level Architecture
The system operates on a **Hybrid Decentralized Architecture**:
1.  **Trust Layer (Blockchain)**: An Ethereum-based Smart Contract acts as the "Source of Truth." It records *who* issued *what* to *whom*, when it was issued, and if it is valid.
2.  **Storage Layer (IPFS)**: The bulky credential files (PDFs, Images) are encrypted and stored on IPFS (via Pinata). This ensures the blockchain stays lightweight while data remains decentralized.
3.  **Application Layer (Frontend)**: A Next.js web application interfaces with the user's wallet (MetaMask) to sign transactions, encrypt files, and manage keys.
4.  **Metadata Layer (Supabase)**: Enhances User Experience (UX) by indexing encrypted metadata and keys for easier retrieval by the owner, acting as a convenient (but optional) bridge between the raw blockchain data and the UI.

### 3.2 Technology Stack

#### Frontend (Client-Side)
-   **Framework**: Next.js 16 (React 19) – For a performant, server-rendered React application.
-   **Language**: TypeScript – Ensures type safety and code reliability.
-   **Styling**: Tailwind CSS v4 – For a modern, responsive user interface.
-   **Blockchain Interaction**: `viem` & `wagmi` – Libraries to connect with Ethereum wallets and interact with smart contracts.
-   **Encryption**: Web Crypto API (Native Browser Standard) – Handles AES-256-GCM encryption client-side.
-   **Storage Client**: Pinata SDK – Manages uplods to IPFS.

#### Backend (Smart Contracts & Infrastructure)
-   **Platform**: Ethereum Virtual Machine (EVM).
-   **Language**: Solidity (v0.8.19).
-   **Development Framework**: Hardhat (v3 Beta).
-   **Contract Standards**: OpenZeppelin (AccessControl) – For secure Role-Based Access Control (RBAC).

#### External Services
-   **Pinata**: IPFS Pinning Service (ensures files stick around).
-   **Supabase**: PostgreSQL database for indexing user credentials and storing encrypted keys (UX enhancement).

---

## 4. Implementation Details

### 4.1 Smart Contract: `CredentialRegistry.sol`
The core logic resides in a Solidity smart contract that manages permissions and issuance.

**Key Roles (RBAC):**
-   **`DEFAULT_ADMIN_ROLE`**: Can add new Universities (Issuers).
-   **`ISSUER_ROLE`**: Can issue new credentials and revoke their own issued credentials.

**Data Structure (`Credential` Struct):**
-   `ipfsHash` (string): The CID of the encrypted file on IPFS.
-   `issuer` (address): Wallet address of the university/organization.
-   `holder` (address): Wallet address of the student/recipient.
-   `issuanceDate` (uint256): Timestamp of creation.
-   `validUntil` (uint256): Optional expiration date (e.g., for certifications).
-   `isRevoked` (bool): Security flag.

**Core Functions:**
1.  `addUniversity(address _university)`: Admin grants issuing rights.
2.  `issueCredential(...)`: Mints a new credential, linking an IPFS hash to a holder.
3.  `revokeCredential(bytes32 credId)`: Invalidates a specific credential ID.
4.  `fetchCredential(bytes32 _credId)`: Returns data and calculates validity (checks expiration).
5.  `getMyCredentials()`: Returns list of credential IDs owned by the caller.

### 4.2 The "Issuance" Workflow
1.  **Configuration**: Issuer selects a template (Diploma, Certificate, etc.).
2.  **Input**: Issuer enters Student Address, Expiration Date, and uploads the PDF/Image.
3.  **Encryption (Client-Side)**:
    -   Browser generates a random **AES-256** key.
    -   File + Metadata are bundled and encryptd using **AES-GCM**.
4.  **Storage**: The encrypted blob is uploaded to **IPFS** via Pinata. A CID (Content Identifier) is returned.
5.  **Minting**: Issuer accepts a MetaMask transaction to call `issueCredential` on the smart contract with the CID and Student Address.
6.  **Persistence**: The Encryption Key and CID are stored in Supabase (linked to the receiver) for easy access, or generated as a shareable link.

### 4.3 The "Verification" Workflow
1.  **Access**: A Verifier receives a link containing the `cid` and the `encryption_key` (in the URL fragment).
2.  **Blockchain Check**: The frontend calls `fetchCredential(cid)` on the Smart Contract.
    -   *If `isRevoked` is true* -> **REJECT**.
    -   *If `validUntil` < current time* -> **REJECT (Expired)**.
    -   *Otherwise* -> **VALID**.
3.  **Decryption**: If valid, the browser downloads the file from IPFS and uses the key from the URL to decrypt the bundle.
4.  **Display**: The original file and metadata are shown to the user with a "Verified" badge.

---

## 5. Security & Privacy Features

-   **Zero-Knowledge Principles (Architecture Level)**: While currently using direct encryption, the architecture respects privacy by design. The blockchain only stores opaque hashes. No personal data (names, grades) is visible on the public ledger. Only the holder (who has the key) can reveal the contents.
-   **AES-GCM Encryption**: An authenticated encryption standard that ensures data confidentiality and integrity. If the encrypted data is tampered with on IPFS, decryption will fail, alerting the user.
-   **Role-Based Access Control (RBAC)**: Only authorized wallet addresses can issue credentials, preventing unauthorized minting.

---

## 6. Future Scope

1.  **Did (Decentralized Identifiers)**: Integrate W3C DIDs for fully standardized identity management.
2.  **Verifiable Credentials (VCs)**: Upgrade metadata format to match the W3C Verifiable Credentials data model.
3.  **ZK-SNARKs Integration**: Implement pure Zero-Knowledge Proofs to allow proving specific facts (e.g., "GPA > 3.0" or "Age > 21") without revealing the entire document.
4.  **Mobile App**: dedicated mobile wallet for easier credential showing via QR codes.

---

## 7. Conclusion

The ZK Credential App represents a significant step forward in digital record-keeping. By combining the immutability of blockchain with the flexibility of IPFS and the security of modern encryption, it creates a trustless environment where credentials are permanent, verifiable, and user-owned. It effectively solves the "Fake Degree" problem and dramatically reduces the administrative overhead of verification for employers and institutions.
