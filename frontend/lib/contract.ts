import { parseAbi } from "viem";

export const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const abi = parseAbi([
    "function ISSUER_ROLE() view returns (bytes32)",
    "function issueCredential(address,string)",
    "function addUniversity(address)",
    "function fetchCredential(bytes32) view returns (string,address,bool)",
    "function getMyCredentials() view returns (bytes32[])",
    "function revokeCredential(bytes32)"
]);
