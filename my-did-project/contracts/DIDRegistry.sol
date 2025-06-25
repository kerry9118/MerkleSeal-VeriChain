// In contracts/DIDRegistry.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DIDRegistry
 * @dev A simple registry for Decentralized Identifiers (DIDs).
 * It allows creating, resolving, updating, and revoking DIDs.
 * Each DID is associated with a controller address and a document (e.g., IPFS CID).
 */
contract DIDRegistry {

    enum Status { Active, Revoked }

    struct DIDDocument {
        address controller;
        string cid; // Content Identifier for the DID document (e.g., on IPFS)
        Status status;
    }

    // Mapping from a DID (which is a bytes32 hash) to its document.
    mapping(bytes32 => DIDDocument) private dids;
    mapping(address => uint256) private nonces;
    event DIDRegistered(bytes32 indexed did, address indexed controller, string cid);
    event DIDUpdated(bytes32 indexed did, string newCid);
    event DIDRevoked(bytes32 indexed did);
    
    mapping(address => bytes32[]) private ownerToDIDs;
    /**
     * @dev Creates a new DID for the caller.
     * The DID itself is derived from the controller's address and a nonce.
     * @param _cid The Content Identifier for the associated DID document.
     */
    function createDID(string calldata _cid) public {
        // 使用 nonce 来确保唯一性
        uint256 userNonce = nonces[msg.sender];
        bytes32 did = keccak256(abi.encodePacked(msg.sender, userNonce));
        
        // 检查 DID 是否存在 (虽然现在几乎不可能碰撞，但保留是个好习惯)
        require(dids[did].controller == address(0), "DIDRegistry: DID already exists");

        dids[did] = DIDDocument({
            controller: msg.sender,
            cid: _cid,
            status: Status.Active
        });
        
        // 创建成功后，增加用户的 nonce
        nonces[msg.sender]++;
        ownerToDIDs[msg.sender].push(did);

        emit DIDRegistered(did, msg.sender, _cid);
    }

    /**
     * @dev Updates the CID for an existing DID.
     * Only the current controller of the DID can perform this action.
     * @param _did The DID to update.
     * @param _newCid The new Content Identifier.
     */
    function updateDID(bytes32 _did, string calldata _newCid) public {
        DIDDocument storage doc = dids[_did];
        require(doc.controller != address(0), "DIDRegistry: DID does not exist");
        require(doc.controller == msg.sender, "DIDRegistry: Caller is not the controller");
        require(doc.status == Status.Active, "DIDRegistry: DID is revoked");

        doc.cid = _newCid;
        emit DIDUpdated(_did, _newCid);
    }

    /**
     * @dev Revokes a DID, marking it as no longer active.
     * Only the controller can revoke their DID.
     * @param _did The DID to revoke.
     */
    function revokeDID(bytes32 _did) public {
        DIDDocument storage doc = dids[_did];
        require(doc.controller != address(0), "DIDRegistry: DID does not exist");
        require(doc.controller == msg.sender, "DIDRegistry: Caller is not the controller");
        require(doc.status == Status.Active, "DIDRegistry: DID is already revoked");

        doc.status = Status.Revoked;
        emit DIDRevoked(_did);
    }

    /**
     * @dev Resolves a DID to get its associated document details.
     * @param _did The DID to resolve.
     * @return The controller address, the CID, and the status.
     */
    function resolveDID(bytes32 _did) public view returns (address, string memory, Status) {
        DIDDocument storage doc = dids[_did];
        require(doc.controller != address(0), "DIDRegistry: DID does not exist");
        return (doc.controller, doc.cid, doc.status);
    }
    function getDIDsByOwner(address _owner) public view returns (bytes32[] memory) {
    return ownerToDIDs[_owner];
}

}
