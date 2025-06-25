// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract VerifiableCredential {
    struct Credential {
        address issuer;
        bytes32 subjectDID;
        string ipfsHash; // Hash of the VC data on IPFS
        bool revoked;
    }

    mapping(bytes32 => Credential) private _credentials;
    mapping(address => bool) public trustedIssuers;
    address public owner;

    event CredentialIssued(bytes32 indexed credentialId, address indexed issuer, bytes32 indexed subjectDID);
    event CredentialRevoked(bytes32 indexed credentialId);
    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);

    constructor() {
        owner = msg.sender;
        trustedIssuers[msg.sender] = true; // Contract deployer is an initial trusted issuer
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "VC: Caller is not the owner");
        _;
    }

    modifier onlyTrustedIssuer() {
        require(trustedIssuers[msg.sender], "VC: Caller is not a trusted issuer");
        _;
    }

    function addIssuer(address issuer) public onlyOwner {
        require(!trustedIssuers[issuer], "VC: Issuer already trusted");
        trustedIssuers[issuer] = true;
        emit IssuerAdded(issuer);
    }

    function removeIssuer(address issuer) public onlyOwner {
        require(trustedIssuers[issuer], "VC: Issuer not trusted");
        trustedIssuers[issuer] = false;
        emit IssuerRemoved(issuer);
    }

    /**
     * @dev Issues a new credential to a subject's DID.
     * @param credentialId A unique identifier for the credential.
     * @param subjectDID The DID of the credential subject.
     * @param ipfsHash The IPFS hash of the credential data.
     */
    function issueCredential(bytes32 credentialId, bytes32 subjectDID, string memory ipfsHash) public onlyTrustedIssuer {
        require(_credentials[credentialId].issuer == address(0), "VC: Credential ID already exists");

        _credentials[credentialId] = Credential({
            issuer: msg.sender,
            subjectDID: subjectDID,
            ipfsHash: ipfsHash,
            revoked: false
        });

        emit CredentialIssued(credentialId, msg.sender, subjectDID);
    }

    /**
     * @dev Revokes a credential. Can only be called by the original issuer.
     * @param credentialId The ID of the credential to revoke.
     */
    function revokeCredential(bytes32 credentialId) public {
        Credential storage cred = _credentials[credentialId];
        require(cred.issuer == msg.sender, "VC: Caller is not the issuer");
        require(!cred.revoked, "VC: Credential already revoked");
        
        cred.revoked = true;
        emit CredentialRevoked(credentialId);
    }

    /**
     * @dev Verifies if a credential is valid (exists and not revoked).
     * @param credentialId The ID of the credential to verify.
     * @return isValid True if the credential exists and is not revoked.
     * @return issuer The address of the issuer.
     * @return ipfsHash The IPFS hash of the credential data.
     */
    function verifyCredential(bytes32 credentialId) public view returns (bool isValid, address issuer, string memory ipfsHash) {
        Credential storage cred = _credentials[credentialId];
        if (cred.issuer == address(0) || cred.revoked) {
            return (false, address(0), "");
        }
        return (true, cred.issuer, cred.ipfsHash);
    }
}