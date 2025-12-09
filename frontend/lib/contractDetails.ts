import { parseAbi } from "viem";

export const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
// export const contractAddress = "0xC65529E65451F0e5E3b878a49b339139c16bc51B";

export const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

export const contractAbi = parseAbi([
    "function ISSUER_ROLE() view returns (bytes32)",
    "function issueCredential(address,string,uint256)",
    "function addIssuer(address)",
    "function removeIssuer(address)",
    "function fetchCredential(bytes32) view returns (string,address,address,bool,uint256)",
    "function getMyCredentials() view returns (bytes32[])",
    "function revokeCredential(bytes32)",
    "function hasRole(bytes32, address) view returns (bool)",
    "function getIssuedCredentials(address) view returns (bytes32[])",
    "function getAllIssuers() view returns (address[])",
    "event IssuerRemoved(address indexed issuer)",
    "event CredentialIssued(bytes32 indexed credId, address indexed issuer, address indexed holder, uint256 validUntil)"
]);
