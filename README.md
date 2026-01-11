# PrivChain

The **PrivChain** is a decentralized, privacy-preserving platform for issuing, storing, and verifying academic and professional credentials. It leverages Blockchain technology for immutable trust and IPFS for decentralized storage, ensuring that credentials are verifiable, secure, and user-owned.

## 🛠️ Features

- **Decentralized Ownership**: Credential holders own their data in their digital wallets, eliminating reliance on centralized authorities.
- **Immutable Trust**: Blockchain ensures credentials cannot be forged or altered once issued.
- **IPFS Storage**: High-availability distributed storage acts as the backbone for document persistence.
- **Role-Based Access Control**: Strict `Admin` and `Issuer` roles ensure only authorized entities can mint credentials.
- **Secure Verification**: Instant verification via smart contract calls—no manual checks required.
- **On-Chain Revocation**: Issuers can revoke credentials instantly if needed.
- **Privacy-Preserving Age Verification (ZKP)**: Users prove eligibility (e.g., age > 18) without revealing their actual birthdate.

## 📸 How It Works

### Issuance Workflow
1. **Configuration**: Issuer selects a template and inputs student details.
2. **Encryption**: The document is encrypted client-side using **AES-256-GCM**.
3. **Storage**: Encrypted file is uploaded to **IPFS**.
4. **Minting**: A smart contract transaction links the IPFS hash to the student's wallet address.

### Verification Workflow
1. **Access**: Verifier receives a link containing the `cid` and decryption key.
2. **Blockchain Check**: The system calls the smart contract to check validity (not revoked, not expired).
3. **Decryption**: If valid, the browser decrypts and displays the original credential.

### Privacy Verification Workflow (ZKP)
1. **Off-Chain Proof**: User generates a ZK proof locally explicitly proving they are over 18, using their birthdate and a secret salt.
2. **On-Chain Verification**: The smart contract verifies the proof against the stored commitment.
3. **Zero-Knowledge**: Validates eligibility without the contract or issuer ever seeing the user's private birthdate.


## 🔐 Zero-Knowledge Proofs (ZKP)

This project utilizes **Zero-Knowledge Proofs** to enhance user privacy. specifically for **Age Verification**.

- **The Problem**: Proving you are over 18 usually requires showing an ID with your full birthdate.
- **The Solution**: Using **Circom** circuits, we generate a mathematical proof that `birthdate <= threshold` and `hash(birthdate, salt) == commitment`.
- **The Result**: The verifier knows you are of age, but *does not know* your exact age or birthdate.

## 🚀 Tech Stack

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Interaction**: Wagmi + Viem
- **Encryption**: Web Crypto API (Native)

### Backend
- **Platform**: Ethereum Virtual Machine (EVM)
- **Smart Contract**: Solidity (v0.8.19)
- **Framework**: Hardhat
- **Dev Tools**: Node.js test runner (`node:test`)

### Privacy & ZKP
- **Circuits**: Circom (v2.0)
- **Proof Generation**: SnarkJS
- **Hashing**: Poseidon (zk-friendly hash function)

### Service
- **IPFS**: Pinata
- **Database**: Supabase (Optional metadata caching)

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB (Optional, if using extended features)
- Metamask (Browser Wallet)

### Installation

Clone the repository:

```bash
git clone https://github.com/FaizanAhmed0107/PrivChain.git
cd PrivChain
```

#### Backend Setup

1. Go to the backend folder:
   ```bash
   cd backend
   npm install
   ```
2. Configure `.env`:
   ```bash
   cp .env.example .env
   # Add your SEPOLIA_PRIVATE_KEY and other vars
   ```
3. Compile and Deploy:
   ```bash
   npx hardhat compile
   npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
   ```

#### Frontend Setup

1. Go to the frontend folder:
   ```bash
   cd ../frontend
   npm install
   ```
2. Configure `.env.local`:
   ```bash
   cp .env.local.example .env.local
   # Add NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID, NEXT_PUBLIC_PINATA_JWT etc.
   ```
3. Run the App:
   ```bash
   npm run dev
   ```

## 🛡️ Smart Contract

The Ethereum smart contract (`CredentialRegistry.sol`) handles:

- **Issuance**: Minting new credentials to a holder's address.
- **Revocation**: Marking a credential ID as invalid.
- **Validation**: Checking expiration dates and revocation status.
- **Validation**: Checking expiration dates and revocation status.
- **ZKP Verification**: Verifies Groth16 proofs for privacy-preserving age checks.
- **Access Control**: Managing issuer permissions.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new feature branch (`git checkout -b feature-branch`).
3. Commit your changes.
4. Push to the branch.
5. Submit a pull request.

## ❤️ Acknowledgments

- **OpenZeppelin**: For secure contract standards.
- **Pinata**: For reliable IPFS pinning.
- **Hardhat**: For an excellent development environment.

## 📬 Contact

For queries or collaboration opportunities, feel free to reach out:

Email: faizanahmed0107@gmail.com
