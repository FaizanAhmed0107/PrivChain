# PrivChain - Frontend

This is the web application interface for the PrivChain, built with **Next.js 16** and **React 19**.

## Overview

The frontend allows users to:
- **Connect Wallet**: Secure login using MetaMask (or other EVM wallets) via Wagmi/Viem.
- **Dashboard**: View received and issued credentials.
- **Issue Credential**: (For approved issuers) Upload files to IPFS and mint credentials on-chain.
- **Verify Credential**: View and verify credentials via shared links.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) + [Shadcn UI](https://ui.shadcn.com/) (using Radix Primitives)
- **Blockchain**: [Wagmi](https://wagmi.sh) & [Viem](https://viem.sh)
- **Storage**: [Pinata SDK](https://docs.pinata.cloud/) for IPFS interaction

## Prerequisites

- **Node.js**: v18+ recommended
- **npm**: v9+
- **MetaMask**: Installed in your browser

## Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

Create a `.env.local` file in the `frontend` directory with your API keys and configuration:

```env
# WalletConnect Project ID (from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id

# Pinata API Config for IPFS
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt

# Supabase Config (if applicable)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Usage

### Development Server

Run the development server locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build for Production

To build the application for production:

```bash
npm run build
```

Then start the production server:

```bash
npm start
```

## Key Directories

- `app/`: Next.js App Router pages and layouts.
- `components/`: Reusable UI components.
- `lib/`: Utility functions and configuration (e.g., `contract.ts`, `utils.ts`).
- `hooks/`: Custom React hooks.
