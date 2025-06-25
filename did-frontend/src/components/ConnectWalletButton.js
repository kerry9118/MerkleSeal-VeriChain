import React from 'react';
import { useWeb3 } from '../context/Web3Context';

const ConnectWalletButton = () => {
  const { connectWallet, account, isConnected } = useWeb3();

  const formatAddress = (addr) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div>
      {isConnected ? (
        <p>已连接: {formatAddress(account)}</p>
      ) : (
        <button onClick={connectWallet}>连接 MetaMask 钱包</button>
      )}
    </div>
  );
};

export default ConnectWalletButton;
