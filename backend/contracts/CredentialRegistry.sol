// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IGroth16Verifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[2] calldata _pubSignals
    ) external view returns (bool);
}

contract CredentialRegistry is AccessControl {
    // Role for those who are allowed to issue credentials
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    // ZKP Verifier Contract
    IGroth16Verifier public verifier;

    struct Credential {
        string ipfsHash;
        address issuer;
        address holder;
        uint256 issuanceDate;
        uint256 validUntil;
        bool isRevoked;
        bytes32 commitment; // ZKP Commitment: Poseidon(birthdate, salt)
    }

    // Mapping: Credential ID => Credential Data
    mapping(bytes32 => Credential) public credentials;

    // Mapping to store all credentials per holder
    mapping(address => bytes32[]) private holderCredentials;

    // Mapping to store all credentials per issuer
    mapping(address => bytes32[]) private issuerCredentials;

    // Issuer Tracking
    mapping(address => bool) public isIssuer;
    address[] public issuerList;

    // Events
    event CredentialIssued(
        bytes32 indexed credId,
        address indexed issuer,
        address indexed holder,
        uint256 validUntil
    );
    event CredentialRevoked(bytes32 indexed credId, address indexed revokedBy);
    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);
    event ProofVerified(bytes32 indexed credId, bool success);

    constructor(address _verifierAddress) {
        verifier = IGroth16Verifier(_verifierAddress);

        // Give deployer admin + issuer role
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);

        // Track initial issuer
        isIssuer[msg.sender] = true;
        issuerList.push(msg.sender);
    }

    // -------------------------------
    // 1. Add an Issuer (Only Admin)
    // -------------------------------
    function addIssuer(address _issuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ISSUER_ROLE, _issuer);

        if (!isIssuer[_issuer]) {
            isIssuer[_issuer] = true;
            issuerList.push(_issuer);
        }

        emit IssuerAdded(_issuer);
    }

    // -------------------------------
    // 1b. Remove an Issuer (Only Admin)
    // -------------------------------
    function removeIssuer(
        address _issuer
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ISSUER_ROLE, _issuer);

        if (isIssuer[_issuer]) {
            isIssuer[_issuer] = false;

            // Remove from list (swapping with last element)
            // Note: This changes order but is O(1)
            for (uint i = 0; i < issuerList.length; i++) {
                if (issuerList[i] == _issuer) {
                    issuerList[i] = issuerList[issuerList.length - 1];
                    issuerList.pop();
                    break;
                }
            }

            emit IssuerRemoved(_issuer);
        }
    }

    // ---------------------------------------
    // 2. Issue Credential (Only ISSUER_ROLE)
    // ---------------------------------------
    function issueCredential(
        address _holder,
        string memory _ipfsHash,
        uint256 _validUntil,
        bytes32 _commitment // New Argument for ZKP
    ) external onlyRole(ISSUER_ROLE) returns (bytes32) {
        uint256 timestamp = block.timestamp;

        // Unique ID = hash(timestamp + holder + issuer)
        bytes32 credId = keccak256(abi.encode(timestamp, _holder, msg.sender));

        require(
            credentials[credId].issuanceDate == 0,
            "Credential already exists"
        );

        credentials[credId] = Credential({
            ipfsHash: _ipfsHash,
            issuer: msg.sender,
            holder: _holder,
            issuanceDate: timestamp,
            validUntil: _validUntil,
            isRevoked: false,
            commitment: _commitment
        });

        // Store this credential under holder history
        holderCredentials[_holder].push(credId);

        // Store this credential under issuer history
        issuerCredentials[msg.sender].push(credId);

        emit CredentialIssued(credId, msg.sender, _holder, _validUntil);

        return credId;
    }

    // ---------------------------------------
    // 3. Revoke Credential (issuer or admin)
    // ---------------------------------------
    function revokeCredential(bytes32 credId) external onlyRole(ISSUER_ROLE) {
        Credential storage cred = credentials[credId];

        require(cred.issuanceDate != 0, "Credential does not exist");

        require(
            cred.issuer == msg.sender ||
                hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Only issuer/admin"
        );

        cred.isRevoked = true;

        emit CredentialRevoked(credId, msg.sender);
    }

    // ----------------------------
    // 4. Verify / Fetch Credential
    // ----------------------------
    function fetchCredential(
        bytes32 _credId
    )
        external
        view
        returns (string memory, address, address, bool, uint256, bytes32)
    {
        Credential memory cred = credentials[_credId];
        bool isExpired = (cred.validUntil != 0 &&
            block.timestamp > cred.validUntil);
        return (
            cred.ipfsHash,
            cred.issuer,
            cred.holder,
            cred.isRevoked || isExpired,
            cred.validUntil,
            cred.commitment
        );
    }

    // ------------------------------------------------------
    // 5. ZKP Verification: Prove Age
    // ------------------------------------------------------
    function verifyAge(
        bytes32 _credId,
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint256 _thresholdDate // Public Signal 2 (Public Signal 1 is commitment)
    ) external returns (bool) {
        Credential memory cred = credentials[_credId];
        require(cred.issuanceDate != 0, "Credential not found");
        require(!cred.isRevoked, "Credential revoked");

        // Construction of Public Signals
        // The circuit has 2 public signals: [commitment, thresholdDate]
        // Note: SnarkJS/Circom export usually puts public inputs in a specific order.
        // Based on our circuit: main {public [commitment, thresholdDate]}
        // The Verifier.sol expects signals in the array.

        uint[2] memory pubSignals;
        pubSignals[0] = uint256(cred.commitment);
        pubSignals[1] = _thresholdDate;

        // Call the Verifier Contract
        bool result = verifier.verifyProof(_pA, _pB, _pC, pubSignals);

        emit ProofVerified(_credId, result);
        return result;
    }

    // ------------------------------------------------------
    // 6. Get ALL credentials held by the caller
    // ------------------------------------------------------
    function getMyCredentials() external view returns (bytes32[] memory) {
        return holderCredentials[msg.sender];
    }

    // ------------------------------------------------------
    // 7. Get ALL credentials issued by a specific address
    // ------------------------------------------------------
    function getIssuedCredentials(
        address _issuer
    ) external view returns (bytes32[] memory) {
        return issuerCredentials[_issuer];
    }

    // ------------------------------------------------------
    // 8. Get ALL Issuers
    // ------------------------------------------------------
    function getAllIssuers() external view returns (address[] memory) {
        return issuerList;
    }
}
