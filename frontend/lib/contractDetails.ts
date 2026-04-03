import { parseAbi } from "viem";

// export const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";   //LOCAL
export const contractAddress = "0x33DA3B86fcf59166CC43739a1f3AE1DB34d603F5";   //SEPOLIA

export const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

export const contractAbi = parseAbi([
    "function ISSUER_ROLE() view returns (bytes32)",
    "function issueCredential(address,string,uint256,bytes32) returns (bytes32)",
    "function addIssuer(address)",
    "function removeIssuer(address)",
    "function fetchCredential(bytes32) view returns (string,address,address,bool,uint256,bytes32)",
    "function getMyCredentials() view returns (bytes32[])",
    "function revokeCredential(bytes32)",
    "function hasRole(bytes32, address) view returns (bool)",
    "function getIssuedCredentials(address) view returns (bytes32[])",
    "function getAllIssuers() view returns (address[])",
    "function verifyAge(bytes32,uint256[2],uint256[2][2],uint256[2],uint256) view returns (bool)",
    "function verifyCGPA(bytes32,uint256[2],uint256[2][2],uint256[2],uint256) view returns (bool)",
    "event IssuerRemoved(address indexed issuer)",
    "event CredentialIssued(bytes32 indexed credId, address indexed issuer, address indexed holder, uint256 validUntil)",
    "event ProofVerified(bytes32 indexed credId, bool success)"
]);
