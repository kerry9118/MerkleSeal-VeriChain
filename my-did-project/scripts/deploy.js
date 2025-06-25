// 导入 hardhat 环境中的 ethers
const hre = require("hardhat");
const fs = require("fs"); // 导入 Node.js 的文件系统模块

async function main() {
  // 1. 获取部署者账户
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // 2. 部署 DIDRegistry 合约
  console.log("\nDeploying DIDRegistry...");
  const DIDRegistry = await hre.ethers.getContractFactory("DIDRegistry");
  const didRegistry = await DIDRegistry.deploy();
  // Ethers v6 中，部署后需要等待确认
  await didRegistry.waitForDeployment();
  const didRegistryAddress = await didRegistry.getAddress();
  console.log("DIDRegistry deployed to:", didRegistryAddress);

  // 3. 部署 VCRegistry 合约
  console.log("\nDeploying VCRegistry...");
  const VCRegistry = await hre.ethers.getContractFactory("VCRegistry");
  const vcRegistry = await VCRegistry.deploy();
  await vcRegistry.waitForDeployment();
  const vcRegistryAddress = await vcRegistry.getAddress();
  console.log("VCRegistry deployed to:", vcRegistryAddress);
  
  // 4. (重要) 为部署者授予 ISSUER_ROLE
  console.log("\nGranting ISSUER_ROLE to deployer...");
  // 从 VCRegistry 合约中获取 ISSUER_ROLE 的哈希值
  const issuerRole = await vcRegistry.ISSUER_ROLE(); 
  const tx = await vcRegistry.grantRole(issuerRole, deployer.address);
  await tx.wait(); // 等待交易确认
  console.log(`Granted ISSUER_ROLE to ${deployer.address}`);
  
  // 检查角色是否已成功授予
  const hasRole = await vcRegistry.hasRole(issuerRole, deployer.address);
  console.log(`Does deployer have ISSUER_ROLE? ${hasRole}`);

  // 5. (自动化) 将地址和 ABI 保存到前端目录
  saveFrontendFiles(didRegistry, vcRegistry);
}

// 这是一个辅助函数，用于将合约信息保存到前端项目
function saveFrontendFiles(didRegistry, vcRegistry) {
  const contractsDir = __dirname + "/../client/src/contracts"; // 定位到前端的 contracts 目录

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  // 创建并写入合约地址 JSON 文件
  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify({ 
      DIDRegistry: didRegistry.target, // 在 Ethers v6 中，使用 .target 获取地址
      VCRegistry: vcRegistry.target 
    }, undefined, 2) // 格式化 JSON 输出
  );

  // 读取编译后的 ABI 文件
  const DIDRegistryArtifact = hre.artifacts.readArtifactSync("DIDRegistry");
  const VCRegistryArtifact = hre.artifacts.readArtifactSync("VCRegistry");

  // 将 ABI 文件写入前端目录
  fs.writeFileSync(
    contractsDir + "/DIDRegistry.json",
    JSON.stringify(DIDRegistryArtifact, null, 2)
  );
  fs.writeFileSync(
    contractsDir + "/VCRegistry.json",
    JSON.stringify(VCRegistryArtifact, null, 2)
  );

  console.log("\nContract addresses and ABIs saved to frontend directory.");
}

// Hardhat 推荐的错误处理和脚本执行模式
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
