import React, { useState, createContext, useContext, useCallback } from 'react';
import { ethers } from 'ethers';

// 1. 创建 Context
const Web3Context = createContext(null);

// 2. 创建 Provider 组件
export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);

  const connectWallet = useCallback(async () => {
    if (window.ethereum) {
      try {
        // Ethers v6: 使用 ethers.BrowserProvider 替换 Web3Provider
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        
        // 请求用户授权
        const userSigner = await browserProvider.getSigner();
        const userAccount = await userSigner.getAddress();

        setProvider(browserProvider);
        setSigner(userSigner);
        setAccount(userAccount);

        console.log("Wallet connected:", userAccount);
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        alert("连接钱包失败，请在控制台查看错误。");
      }
    } else {
      alert("请安装 MetaMask 钱包！");
    }
  }, []);

  const value = {
    provider,
    signer,
    account,
    connectWallet,
    isConnected: !!signer,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

// 3. 创建一个自定义 Hook 以方便使用
export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};
