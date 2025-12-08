export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const CredentialRegistryABI = [
    {
        "type": "function",
        "name": "issueCredential",
        "inputs": [
            { "name": "_holder", "type": "address", "internalType": "address" },
            { "name": "_ipfsHash", "type": "string", "internalType": "string" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "fetchCredential",
        "inputs": [
            { "name": "_credId", "type": "bytes32", "internalType": "bytes32" }
        ],
        "outputs": [
            { "name": "", "type": "string", "internalType": "string" },
            { "name": "", "type": "address", "internalType": "address" },
            { "name": "", "type": "bool", "internalType": "bool" }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getMyCredentials",
        "inputs": [],
        "outputs": [
            { "name": "", "type": "bytes32[]", "internalType": "bytes32[]" }
        ],
        "stateMutability": "view"
    }
] as const;
