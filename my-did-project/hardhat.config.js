// --- 正确的 Toolbox 配置 ---
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter"); // gas-reporter 可以保留
require("solidity-coverage");   // coverage 也可以保留

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    // 使用你 gas-reporter 输出中显示的版本
    version: "0.8.28", 
    settings: {
      optimizer: {
        enabled: true, // 建议开启优化器
        runs: 200,
      },
    },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
  },
};
