import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

export const useEthers = () => {
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [account, setAccount] = useState(null);
    const [error, setError] = useState(null);

    const connectWallet = useCallback(async () => {
        if (window.ethereum) {
            try {
                // 1. 创建一个新的 BrowserProvider
                // Ethers v6 中，provider 的创建是关键
                const browserProvider = new ethers.BrowserProvider(window.ethereum);
                setProvider(browserProvider);

                // 2. 请求用户授权连接钱包，并获取账户
                const accounts = await browserProvider.send("eth_requestAccounts", []);
                if (accounts.length > 0) {
                    const currentAccount = accounts[0];
                    setAccount(currentAccount);
                    
                    // 3. 获取 Signer 对象，用于发送交易
                    const currentSigner = await browserProvider.getSigner();
                    setSigner(currentSigner);
                }
                setError(null);
            } catch (e) {
                console.error("连接钱包失败:", e);
                setError("连接钱包失败，请重试。");
            }
        } else {
            setError("请安装 MetaMask 钱包！");
        }
    }, []);

    // 监听账户变化
    useEffect(() => {
        if (window.ethereum) {
            const handleAccountsChanged = (accounts) => {
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                    // 账户变化后，重新获取 signer
                    if(provider) {
                        provider.getSigner().then(setSigner);
                    }
                } else {
                    // 用户断开连接
                    setAccount(null);
                    setSigner(null);
                    setProvider(null);
                }
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);

            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            };
        }
    }, [provider]);

    return { provider, signer, account, error, connectWallet };
};
