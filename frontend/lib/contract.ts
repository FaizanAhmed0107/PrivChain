import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { hardhat } from 'viem/chains';
import { contractAddress, contractAbi, DEFAULT_ADMIN_ROLE } from './contractDetails';

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

// function issueCredential(address,string,uint256)
const issueCredential = async (targetAddress: `0x${string}`, ipfsHash: string, validUntil: bigint, commitment: `0x${string}`): Promise<{ ok: boolean; data?: string; error?: any }> => {
    try {
        if (typeof window === 'undefined' || !(window as any).ethereum) {
            throw new Error("No crypto wallet found. Please install MetaMask.");
        }

        const walletClient = createWalletClient({
            chain: hardhat,
            transport: custom((window as any).ethereum)
        });

        const [account] = await walletClient.requestAddresses();

        console.log("validUntil", validUntil);
        console.log("commitment", commitment);

        // Use writeContract for state-changing functions
        const hash = await walletClient.writeContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "issueCredential",
            args: [targetAddress, ipfsHash, validUntil, commitment], // Pass the required arguments
            account
        });

        const client = initClient();
        const receipt = await client.waitForTransactionReceipt({ hash });

        let credId = "";
        for (const log of receipt.logs) {
            try {
                // Topic 1 is the first indexed argument: credId (bytes32)
                if (log.topics[1]) {
                    credId = log.topics[1];
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        return { ok: true, data: credId || hash }; // Return credId if found, else hash (fallback)
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


// function fetchCredential(bytes32) view returns (string,address,address,bool,uint256)
const getCredentialDetails = async (credId: string): Promise<{ ok: boolean; data?: { ipfsHash: string; issuer: string; holder: string; isRevoked: boolean; validUntil: bigint }; error?: any }> => {
    try {
        const client = initClient();
        const formattedCredId = credId.startsWith("0x") ? credId : `0x${credId}`;

        const data = await client.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "fetchCredential",
            args: [formattedCredId as `0x${string}`]
        }) as [string, string, string, boolean, bigint, string];

        return {
            ok: true,
            data: {
                ipfsHash: data[0],
                issuer: data[1],
                holder: data[2],
                isRevoked: data[3],
                validUntil: data[4]
            }
        };
    } catch (err) {
        console.error(err);
        return { ok: false, error: err };
    }
};

// function getIssuedCredentials(address) view returns (bytes32[])
const getIssuedCredentials = async (): Promise<{ ok: boolean; data?: any; error?: any }> => {
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
            functionName: "getIssuedCredentials",
            args: [account]
        });

        return { ok: true, data: data };
    } catch (err) {
        console.error(err);
        return { ok: false, error: err };
    }
};

// function revokeCredential(bytes32)
const revokeCredential = async (credId: string): Promise<{ ok: boolean; data?: string; error?: any }> => {
    try {
        if (typeof window === 'undefined' || !(window as any).ethereum) {
            throw new Error("No crypto wallet found. Please install MetaMask.");
        }

        const walletClient = createWalletClient({
            chain: hardhat,
            transport: custom((window as any).ethereum)
        });

        const [account] = await walletClient.requestAddresses();

        const hash = await walletClient.writeContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "revokeCredential",
            args: [credId as `0x${string}`],
            account
        });

        return { ok: true, data: hash };
    } catch (err) {
        console.error(err);
        return { ok: false, error: err };
    }
};

const checkIsAdmin = async (userAddress: string): Promise<{ ok: boolean; isAdmin?: boolean; error?: any }> => {
    try {
        const client = initClient();
        const isAdmin = await client.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "hasRole",
            args: [DEFAULT_ADMIN_ROLE as `0x${string}`, userAddress as `0x${string}`]
        });

        return { ok: true, isAdmin };
    } catch (err) {
        console.error(err);
        return { ok: false, error: err };
    }
};

const checkIsIssuer = async (userAddress: string): Promise<{ ok: boolean; isIssuer?: boolean; error?: any }> => {
    try {
        const client = initClient();

        const issuerRoleData = await client.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "ISSUER_ROLE",
        });

        const isIssuer = await client.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "hasRole",
            args: [issuerRoleData as `0x${string}`, userAddress as `0x${string}`]
        });

        return { ok: true, isIssuer };
    } catch (err) {
        console.error(err);
        return { ok: false, error: err };
    }
};

const getAllIssuers = async (): Promise<{ ok: boolean; data?: string[]; error?: any }> => {
    try {
        const client = initClient();
        const data = await client.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "getAllIssuers",
        });

        return { ok: true, data: data as string[] };
    } catch (err) {
        console.error(err);
        return { ok: false, error: err };
    }
};

const addIssuer = async (issuerAddress: string): Promise<{ ok: boolean; data?: string; error?: any }> => {
    try {
        if (typeof window === 'undefined' || !(window as any).ethereum) {
            throw new Error("No crypto wallet found. Please install MetaMask.");
        }

        const walletClient = createWalletClient({
            chain: hardhat,
            transport: custom((window as any).ethereum)
        });

        const [account] = await walletClient.requestAddresses();

        const hash = await walletClient.writeContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "addIssuer",
            args: [issuerAddress as `0x${string}`],
            account
        });

        return { ok: true, data: hash };
    } catch (err) {
        console.error(err);
        return { ok: false, error: err };
    }
};

const removeIssuer = async (issuerAddress: string): Promise<{ ok: boolean; data?: string; error?: any }> => {
    try {
        if (typeof window === 'undefined' || !(window as any).ethereum) {
            throw new Error("No crypto wallet found. Please install MetaMask.");
        }

        const walletClient = createWalletClient({
            chain: hardhat,
            transport: custom((window as any).ethereum)
        });

        const [account] = await walletClient.requestAddresses();

        const hash = await walletClient.writeContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "removeIssuer",
            args: [issuerAddress as `0x${string}`],
            account
        });

        return { ok: true, data: hash };
    } catch (err) {
        console.error(err);
        return { ok: false, error: err };
    }
};

// function verifyAge(...)
const verifyAge = async (credId: string, pA: any, pB: any, pC: any, pubSignals: any): Promise<{ ok: boolean; isValid?: boolean; error?: any }> => {
    try {
        const client = initClient();
        const formattedCredId = credId.startsWith("0x") ? credId : `0x${credId}`;

        // We use readContract to simulate the verification for free
        const isValid = await client.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "verifyAge",
            args: [
                formattedCredId as `0x${string}`,
                pA,
                pB,
                pC,
                pubSignals[1] // thresholdDate (pubSignals[0] is commitment, which contract fetches)
            ]
        });

        return { ok: true, isValid };
    } catch (err) {
        console.error(err);
        return { ok: false, error: err };
    }
};

export { fetchRole, issueCredential, getMyCredentials, getCredentialDetails, checkIsAdmin, getIssuedCredentials, revokeCredential, checkIsIssuer, getAllIssuers, addIssuer, removeIssuer, verifyAge };