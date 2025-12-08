import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { hardhat } from 'viem/chains';
import { contractAddress, contractAbi } from './contractDetails';

const initClient = () => {
    // 1. Setup Client
    const client = createPublicClient({
        chain: hardhat,
        transport: http(),
    });

    return client;
}

const fetchRole = async (): Promise<{ ok: boolean; data?: string; error?: any }> => {
    try {
        const client = initClient();
        const address = contractAddress;
        const abi = contractAbi;

        const data = await client.readContract({
            address,
            abi,
            functionName: "ISSUER_ROLE",
        });

        return { ok: true, data };
    } catch (err) {
        console.error(err);
        return { ok: false, error: err };
    }
};

// function issueCredential(address,string)
const issueCredential = async (targetAddress: `0x${string}`, ipfsHash: string): Promise<{ ok: boolean; data?: string; error?: any }> => {
    try {
        if (typeof window === 'undefined' || !(window as any).ethereum) {
            throw new Error("No crypto wallet found. Please install MetaMask.");
        }

        const walletClient = createWalletClient({
            chain: hardhat,
            transport: custom((window as any).ethereum)
        });

        const [account] = await walletClient.requestAddresses();

        // Use writeContract for state-changing functions
        const hash = await walletClient.writeContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "issueCredential",
            args: [targetAddress, ipfsHash], // Pass the required arguments
            account
        });

        return { ok: true, data: hash };
    } catch (err) {
        console.error(err);
        return { ok: false, error: err };
    }
};

// function getMyCredentials() view returns (bytes32[])
const getMyCredentials = async (): Promise<{ ok: boolean; data?: any; error?: any }> => {
    try {
        if (typeof window === 'undefined' || !(window as any).ethereum) {
            throw new Error("No crypto wallet found. Please install MetaMask.");
        }

        const walletClient = createWalletClient({
            chain: hardhat,
            transport: custom((window as any).ethereum)
        });

        const [account] = await walletClient.requestAddresses();
        const client = initClient();

        const data = await client.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "getMyCredentials",
            account
        });

        return { ok: true, data: data };
    } catch (err) {
        console.error(err);
        return { ok: false, error: err };
    }
};


// function fetchCredential(bytes32) view returns (string,address,bool)
const getCredentialDetails = async (credId: string): Promise<{ ok: boolean; data?: { ipfsHash: string; issuer: string; isRevoked: boolean }; error?: any }> => {
    try {
        const client = initClient();
        const data = await client.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "fetchCredential",
            args: [credId as `0x${string}`]
        }) as [string, string, boolean];

        return {
            ok: true,
            data: {
                ipfsHash: data[0],
                issuer: data[1],
                isRevoked: data[2]
            }
        };
    } catch (err) {
        console.error(err);
        return { ok: false, error: err };
    }
};

export { fetchRole, issueCredential, getMyCredentials, getCredentialDetails };