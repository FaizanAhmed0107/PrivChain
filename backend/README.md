# Secure Credential Registry - Backend

This directory contains the smart contract and deployment scripts for the Secure Credential Registry application. It is built using [Hardhat](https://hardhat.org/).

## Smart Contract

The core of this project is the `CredentialRegistry.sol` smart contract.

**Key Features:**
- **Role-Based Access Control (RBAC)**: Managed via OpenZeppelin's `AccessControl`.
  - `DEFAULT_ADMIN_ROLE`: Can regulate issuers (add/remove universities).
  - `ISSUER_ROLE`: Can issue and revoke credentials.
- **Credential Management**:
  - Issue credentials with IPFS hash, student address, and optional expiration.
  - Revoke credentials.
  - Fetch credential details and validity status.
  - List credentials owned by a user.

## Prerequisites

- **Node.js**: v18+ recommended
- **npm**: v9+

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

Create a `.env` file in the `backend` directory with the following variables:

```env
# Private Key for the account to deploy contracts
SEPOLIA_PRIVATE_KEY=your_private_key_here

# Optional: API Keys for verification (if you plan to verify on Etherscan)
ETHERSCAN_API_KEY=your_etherscan_api_key
```

> [!WARNING]
> Never commit your `.env` file or private keys to version control.

## Usage

### Compile Contracts

```bash
npx hardhat compile
```

### Run Tests

Run the full test suite (Solidity + Node.js tests):

```bash
npx hardhat test
```

### Deploy

To deploy the smart contract to the Sepolia testnet using Hardhat Ignition:

```bash
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```
*(Note: Ensure you have updated the module path to your actual deployment module if it differs from `Counter.ts`)*

## Project Structure

- `contracts/`: Solidity smart contracts.
- `ignition/`: Deployment modules (Ignition).
- `test/`: Unit tests.
- `hardhat.config.ts`: Hardhat configuration.
