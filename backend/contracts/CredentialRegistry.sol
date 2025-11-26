// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract CredentialRegistry is AccessControl {
    
    // Role for Universities who are allowed to issue credentials
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    struct Credential {
        string ipfsHash;      
        address issuer;
        address holder;
        uint256 issuanceDate;
        bool isRevoked;
    }

    // Mapping: Credential ID => Credential Data
    mapping(bytes32 => Credential) public credentials;

    // NEW: Mapping to store all credentials per holder
    mapping(address => bytes32[]) private holderCredentials;
    
    // Events
    event CredentialIssued(bytes32 indexed credId, address indexed issuer, address indexed holder);
    event CredentialRevoked(bytes32 indexed credId, address indexed revokedBy);
    event UniversityAdded(address indexed university);

    constructor() {
        // Give deployer admin + issuer role
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
    }

    // -------------------------------
    // 1. Add a University (Only Admin)
    // -------------------------------
    function addUniversity(address _university) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ISSUER_ROLE, _university);
        emit UniversityAdded(_university);
    }

    // ---------------------------------------
    // 2. Issue Credential (Only ISSUER_ROLE)
    // ---------------------------------------
    function issueCredential(
        address _holder, 
        string memory _ipfsHash
    ) external onlyRole(ISSUER_ROLE) {

        uint256 timestamp = block.timestamp;

        // Unique ID = hash(timestamp + holder + issuer)
        bytes32 credId = keccak256(abi.encode(timestamp, _holder, msg.sender));

        require(credentials[credId].issuanceDate == 0, "Credential already exists");

        credentials[credId] = Credential({
            ipfsHash: _ipfsHash,
            issuer: msg.sender,
            holder: _holder,
            issuanceDate: timestamp,
            isRevoked: false
        });

        // Store this credential under holder history
        holderCredentials[_holder].push(credId);

        emit CredentialIssued(credId, msg.sender, _holder);
    }

    // ---------------------------------------
    // 3. Revoke Credential (issuer or admin)
    // ---------------------------------------
    function revokeCredential(bytes32 credId) external onlyRole(ISSUER_ROLE) {
        Credential storage cred = credentials[credId];

        require(cred.issuanceDate != 0, "Credential does not exist");

        require(
            cred.issuer == msg.sender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Only issuer/admin"
        );

        cred.isRevoked = true;

        emit CredentialRevoked(credId, msg.sender);
    }

    // ----------------------------
    // 4. Verify / Fetch Credential
    // ----------------------------
    function fetchCredential(bytes32 _credId) 
        external 
        view 
        returns (string memory, address, bool) 
    {
        Credential memory cred = credentials[_credId];
        return (cred.ipfsHash, cred.issuer, cred.isRevoked);
    }

    // ------------------------------------------------------
    // 5. NEW — Get ALL credentials held by the caller
    // ------------------------------------------------------
    function getMyCredentials() external view returns (bytes32[] memory) {
        return holderCredentials[msg.sender];
    }
}
