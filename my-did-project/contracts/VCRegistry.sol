// In contracts/VCRegistry.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "hardhat/console.sol";
/**
 * @title VCRegistry
 * @dev Manages the issuance and revocation of Verifiable Credentials (VCs)
 * using a Merkle tree approach for batch operations.
 * Issuers are managed via an AccessControl role.
 */
contract VCRegistry is AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    // Mapping from a Merkle root to the address of the issuer who published it.
    mapping(bytes32 => address) public merkleRootToIssuer;

    // Mapping to track revoked VCs. A leaf is the keccak256 hash of a VC.
    mapping(bytes32 => bool) public isBatchCredentialRevoked;

    event BatchCredentialsIssued(bytes32 indexed merkleRoot, address indexed issuer);
    event BatchCredentialRevoked(bytes32 indexed leaf, bytes32 indexed merkleRoot, address indexed revoker);

    constructor() {
        // The deployer gets both admin and issuer roles by default.
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
    }

    /**
     * @dev Grants the ISSUER_ROLE to an account.
     * Can only be called by an account with the DEFAULT_ADMIN_ROLE.
     */
    function grantIssuerRole(address _issuer) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ISSUER_ROLE, _issuer);
    }

    /**
     * @dev Revokes the ISSUER_ROLE from an account.
     * Can only be called by an account with the DEFAULT_ADMIN_ROLE.
     */
    function revokeIssuerRole(address _issuer) public onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ISSUER_ROLE, _issuer);
    }

    /**
     * @dev Issues a batch of VCs by committing their Merkle root to the chain.
     * @param _merkleRoot The root of the Merkle tree of VC hashes.
     */
    function issueBatchCredentials(bytes32 _merkleRoot) public onlyRole(ISSUER_ROLE) {
        require(merkleRootToIssuer[_merkleRoot] == address(0), "VCRegistry: Merkle root already exists");
        merkleRootToIssuer[_merkleRoot] = msg.sender;
        emit BatchCredentialsIssued(_merkleRoot, msg.sender);
    }

    /**
     * @dev Revokes a specific VC from a batch.
     * @param _leaf The hash of the VC to revoke.
     * @param _merkleRoot The Merkle root of the batch this VC belongs to.
     */
    function revokeBatchCredential(bytes32 _leaf, bytes32 _merkleRoot) public {
        address issuer = merkleRootToIssuer[_merkleRoot];
        require(issuer != address(0), "VCRegistry: Merkle root does not exist");
        require(msg.sender == issuer, "VCRegistry: Caller is not the batch issuer");
        require(!isBatchCredentialRevoked[_leaf], "VCRegistry: Credential already revoked");

        isBatchCredentialRevoked[_leaf] = true;
        emit BatchCredentialRevoked(_leaf, _merkleRoot, msg.sender);
    }

    /**
     * @dev Verifies if a VC is valid (part of a batch and not revoked).
     * @param _leaf The hash of the VC.
     * @param _merkleRoot The Merkle root of the batch.
     * @param _proof The Merkle proof for the leaf.
     * @return A boolean indicating validity and the address of the issuer.
     */
    function verifyCredential(
        bytes32 _leaf,
        bytes32 _merkleRoot,
        bytes32[] calldata _proof
    ) public view returns (bool, address) {
        if (isBatchCredentialRevoked[_leaf]) {
            return (false, address(0));
        }

        address issuer = merkleRootToIssuer[_merkleRoot];
        if (issuer == address(0)) {
            return (false, address(0));
        }

        // =======================================================
        // THE CRITICAL FIX IS HERE!
        // We pass `_merkleRoot` to the verify function, not `issuer`.
        // =======================================================
        bool isValid = MerkleProof.verify(_proof, _merkleRoot, _leaf);
        console.log("MerkleProof.verify est",isValid);

        if (isValid) {
            return (true, issuer);
        } else {
            return (false, address(0));
        }
    }
}
