const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

describe("DID and VC System", function () {
    let deployer, user1, user2, unauthorizedUser;
    let didRegistry, vcRegistry;

    // Enum values from the contract
    const Status = { Active: 0, Revoked: 1 };

    beforeEach(async function () {
        [deployer, user1, user2, unauthorizedUser] = await ethers.getSigners();

        const DIDRegistryFactory = await ethers.getContractFactory("DIDRegistry");
        didRegistry = await DIDRegistryFactory.deploy();
        await didRegistry.waitForDeployment();

        const VCRegistryFactory = await ethers.getContractFactory("VCRegistry");
        vcRegistry = await VCRegistryFactory.deploy();
        await vcRegistry.waitForDeployment();
    });

    describe("DIDRegistry", function () {
        // ... (DIDRegistry tests remain unchanged, they are passing)
        const ipfsCid1 = "QmXg9Pp2ytZ14xgmQjPyYnHRfT7dJ2vGvG9x3v1a1a1a1a";
        const ipfsCid2 = "QmYh9Pp2ytZ14xgmQjPyYnHRfT7dJ2vGvG9x3v2b2b2b2b";

        it("Should allow a user to create a DID", async function () {
            const tx = await didRegistry.connect(user1).createDID(ipfsCid1);
            const receipt = await tx.wait();
            const event = receipt.logs.find(e => e.eventName === 'DIDRegistered');
            const did = event.args.did;
            const [controller, cid, status] = await didRegistry.resolveDID(did);
            expect(controller).to.equal(user1.address);
            expect(cid).to.equal(ipfsCid1);
            expect(status).to.equal(Status.Active);
        });

        it("Should allow the controller to update their DID", async function () {
            const tx = await didRegistry.connect(user1).createDID(ipfsCid1);
            const receipt = await tx.wait();
            const event = receipt.logs.find(e => e.eventName === 'DIDRegistered');
            const did = event.args.did;
            await expect(didRegistry.connect(user1).updateDID(did, ipfsCid2))
                .to.emit(didRegistry, "DIDUpdated")
                .withArgs(did, ipfsCid2);
            const [, newCid, ] = await didRegistry.resolveDID(did);
            expect(newCid).to.equal(ipfsCid2);
        });

        it("Should prevent an unauthorized user from updating a DID", async function () {
            const tx = await didRegistry.connect(user1).createDID(ipfsCid1);
            const receipt = await tx.wait();
            const event = receipt.logs.find(e => e.eventName === 'DIDRegistered');
            const did = event.args.did;
            await expect(
                didRegistry.connect(unauthorizedUser).updateDID(did, ipfsCid2)
            ).to.be.revertedWith("DIDRegistry: Caller is not the controller");
        });

        it("Should allow the controller to revoke their DID", async function () {
            const tx = await didRegistry.connect(user1).createDID(ipfsCid1);
            const receipt = await tx.wait();
            const event = receipt.logs.find(e => e.eventName === 'DIDRegistered');
            const did = event.args.did;
            await expect(didRegistry.connect(user1).revokeDID(did))
                .to.emit(didRegistry, "DIDRevoked")
                .withArgs(did);
            const [,, status] = await didRegistry.resolveDID(did);
            expect(status).to.equal(Status.Revoked);
        });

        it("Should prevent revoking an already revoked DID", async function () {
            const tx = await didRegistry.connect(user1).createDID(ipfsCid1);
            const receipt = await tx.wait();
            const event = receipt.logs.find(e => e.eventName === 'DIDRegistered');
            const did = event.args.did;
            await didRegistry.connect(user1).revokeDID(did);
            await expect(
                didRegistry.connect(user1).revokeDID(did)
            ).to.be.revertedWith("DIDRegistry: DID is already revoked");
        });
    });

    describe("VCRegistry", function () {
        let merkleTree, merkleRoot, leaves, proofForLeaf1;
        const leaf1 = keccak256("VC_HASH_1");
        const leaf2 = keccak256("VC_HASH_2");
        const leaf3 = keccak256("VC_HASH_3");
        const nonExistentLeaf = keccak256("NON_EXISTENT_VC");

        beforeEach(async function () {
            leaves = [leaf1, leaf2, leaf3];
            merkleTree = new MerkleTree(leaves.map(l => Buffer.from(l.slice(2), 'hex')), keccak256, { sortPairs: true });
            merkleRoot = merkleTree.getHexRoot();
            proofForLeaf1 = merkleTree.getHexProof(Buffer.from(leaf1.slice(2), 'hex'));
        });

        describe("Role Management", function () {
            // ... (Role Management tests remain unchanged)
            it("Should grant deployer ADMIN and ISSUER roles by default", async function () {
                const ADMIN_ROLE = await vcRegistry.DEFAULT_ADMIN_ROLE();
                const ISSUER_ROLE = await vcRegistry.ISSUER_ROLE();
                expect(await vcRegistry.hasRole(ADMIN_ROLE, deployer.address)).to.be.true;
                expect(await vcRegistry.hasRole(ISSUER_ROLE, deployer.address)).to.be.true;
            });

            it("Should allow ADMIN to grant ISSUER role", async function () {
                const ISSUER_ROLE = await vcRegistry.ISSUER_ROLE();
                await vcRegistry.connect(deployer).grantIssuerRole(user1.address);
                expect(await vcRegistry.hasRole(ISSUER_ROLE, user1.address)).to.be.true;
            });

            it("Should prevent non-ADMIN from granting roles", async function () {
                await expect(
                    vcRegistry.connect(user1).grantIssuerRole(user2.address)
                ).to.be.reverted;
            });
        });

        describe("Batch Credential Issuance and Verification", function () {
            it("Should allow an ISSUER to issue a batch of credentials via Merkle root", async function () {
                await expect(vcRegistry.connect(deployer).issueBatchCredentials(merkleRoot))
                    .to.emit(vcRegistry, "BatchCredentialsIssued")
                    .withArgs(merkleRoot, deployer.address);
                expect(await vcRegistry.merkleRootToIssuer(merkleRoot)).to.equal(deployer.address);
            });

            it("Should prevent a non-ISSUER from issuing a batch", async function () {
                await expect(
                    vcRegistry.connect(unauthorizedUser).issueBatchCredentials(merkleRoot)
                ).to.be.reverted;
            });

            // FAILING TEST 1: FIX APPLIED HERE
/// 在 test/did-vc-system.test.js 文件中

// ... 其他测试 ...

      it("应能正确验证批次中的有效凭证", async function () {
        // 修复 3：定义此测试作用域内所需的变量
        // 我们从 Hardhat 环境中获取签名者。根据你的设置，第一个签名者（部署者）就是 ISSUER。
        const [issuer] = await ethers.getSigners();
        // 使用 Ethers v6 的解构赋值语法，让代码更简洁
        const { keccak256, toUtf8Bytes } = ethers;

        const credentials = ["VC:Alice", "VC:Bob", "VC:Charlie"];

        // 修复 1 (Ethers v6 语法): 不再使用 .utils
        const leaves = credentials.map(cred => keccak256(toUtf8Bytes(cred)));

        // 修复 2 (Merkle Tree 逻辑): 添加 { sortPairs: true } 以匹配 OpenZeppelin 的实现
        const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
        
        const root = merkleTree.getHexRoot();
        
        // 现在 `issuer` 变量已在此作用域中定义
        await vcRegistry.connect(issuer).issueBatchCredentials(root);

        const leaf = leaves[0]; // 我们来验证 Alice 的凭证
        const proof = merkleTree.getHexProof(leaf);

        const [isValid, issuerAddress] = await vcRegistry.verifyCredential(leaf, root, proof);

        // 断言验证结果
        expect(isValid).to.be.true;
        expect(issuerAddress).to.equal(issuer.address);
      });

// ... 文件的其余部分 ...




            // FAILING TEST 2: FIX APPLIED HERE
            it("Should fail verification for an invalid proof", async function () {
                await vcRegistry.connect(deployer).issueBatchCredentials(merkleRoot);
                const badProof = merkleTree.getHexProof(Buffer.from(leaf2.slice(2), 'hex')); 

                // FIX: Pad the bad proof as well, to ensure the call doesn't fail due to data length
                // before the contract can correctly determine the proof is invalid.
                const paddedBadProof = badProof.map(item => ethers.zeroPadValue(item, 32));

                const [isValid, issuer] = await vcRegistry.verifyCredential(leaf1, merkleRoot, paddedBadProof);

                expect(isValid).to.be.false;
                expect(issuer).to.equal(ethers.ZeroAddress);
            });

            it("Should fail verification for a non-existent credential", async function () {
                await vcRegistry.connect(deployer).issueBatchCredentials(merkleRoot);
                const proofForNonExistent = [];
                const [isValid, issuer] = await vcRegistry.verifyCredential(nonExistentLeaf, merkleRoot, proofForNonExistent);
                expect(isValid).to.be.false;
                expect(issuer).to.equal(ethers.ZeroAddress);
            });
        });

        describe("Batch Credential Revocation", function () {
            beforeEach(async function () {
                await vcRegistry.connect(deployer).issueBatchCredentials(merkleRoot);
            });

            it("Should allow the original issuer to revoke a credential from a batch", async function () {
                await expect(vcRegistry.connect(deployer).revokeBatchCredential(leaf1, merkleRoot))
                    .to.emit(vcRegistry, "BatchCredentialRevoked")
                    .withArgs(leaf1, merkleRoot, deployer.address);
                expect(await vcRegistry.isBatchCredentialRevoked(leaf1)).to.be.true;
            });

            // FAILING TEST 3: FIX APPLIED HERE
            it("Should fail verification for a revoked credential", async function () {
                await vcRegistry.connect(deployer).revokeBatchCredential(leaf1, merkleRoot);
                
                // FIX: Pad the proof to ensure the call reaches the contract logic.
                const paddedProof = proofForLeaf1.map(item => ethers.zeroPadValue(item, 32));

                // The contract should now correctly identify it as revoked and return false.
                const [isValid, issuer] = await vcRegistry.verifyCredential(leaf1, merkleRoot, paddedProof);

                expect(isValid).to.be.false;
                expect(issuer).to.equal(ethers.ZeroAddress);
            });

            it("Should prevent a different issuer from revoking a credential", async function () {
                await vcRegistry.connect(deployer).grantIssuerRole(user1.address);
                await expect(
                    vcRegistry.connect(user1).revokeBatchCredential(leaf1, merkleRoot)
                ).to.be.revertedWith("VCRegistry: Caller is not the batch issuer");
            });
        });
    });
});
