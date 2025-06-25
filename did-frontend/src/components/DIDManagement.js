import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';

// 导入合约信息
import contractAddresses from '../contracts/contract-address.json';
import DIDRegistryABI from '../contracts/DIDRegistry.json';

const DIDManagement = () => {
  const { signer, account, isConnected } = useWeb3();
  const [didRegistryContract, setDidRegistryContract] = useState(null);
  const [userDID, setUserDID] = useState(null); // 将存储用户的一个DID (bytes32 hex string)
  const [ipfsCid, setIpfsCid] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: 'info' });

  // 初始化合约实例 (此部分逻辑正确，无需修改)
  useEffect(() => {
    if (signer) {
      const contract = new ethers.Contract(
        contractAddresses.DIDRegistry,
        DIDRegistryABI.abi,
        signer
      );
      setDidRegistryContract(contract);
    } else {
      setDidRegistryContract(null);
    }
  }, [signer]);

  // **【已修改】** 获取用户的 DID
  const fetchUserDID = useCallback(async () => {
    if (didRegistryContract && account) {
      try {
        // **【核心修改 1】** 调用合约中正确的函数 `getDIDsByOwner`
        // 它返回一个 bytes32 类型的数组
        const userDIDs = await didRegistryContract.getDIDsByOwner(account);
        
        // **【核心修改 2】** 处理返回的数组
        // 检查数组是否包含 DID
        if (userDIDs && userDIDs.length > 0) {
            // 根据当前UI设计，我们只显示第一个DID。
            // 如果未来一个用户可以管理多个DID，这里需要修改UI来展示一个列表。
            // userDIDs[0] 是一个 bytes32 格式的十六进制字符串 (例如: "0x...")
            setUserDID(userDIDs[0]); 
            setMessage({ text: '已成功加载您的 DID。', type: 'info' });
        } else {
            setUserDID(null); // 确保状态被重置
            setMessage({ text: '您似乎还没有 DID，请在下方创建一个。', type: 'info' });
        }
      } catch (error) {
          console.error("Error fetching DID:", error);
          setMessage({ text: '获取 DID 失败，请检查控制台获取详情。', type: 'error' });
      }
    }
  }, [didRegistryContract, account]);

  // 当合约或账户变化时，获取用户 DID (此部分逻辑正确，无需修改)
  useEffect(() => {
    if (isConnected) {
      fetchUserDID();
    } else {
      setUserDID(null);
      setMessage({ text: '', type: 'info' });
    }
  }, [fetchUserDID, isConnected]);

  const handleCreateDID = async (e) => {
    e.preventDefault();
    if (!didRegistryContract || !ipfsCid) {
      // 优化提示
      setMessage({ text: "请连接钱包并输入 IPFS CID。", type: 'error' });
      return;
    }

    setIsLoading(true);
    setMessage({ text: '正在发送交易以创建 DID...', type: 'info' });
    try {
      // 调用 createDID 函数 (此部分正确)
      const tx = await didRegistryContract.createDID(ipfsCid);
      setMessage({ text: '交易已发送，正在等待区块链确认...', type: 'info' });
      
      const receipt = await tx.wait(); // 等待交易被打包

      // **【核心修改 3】** 从交易回执中解析正确的事件和参数
      // 合约中事件为: event DIDRegistered(bytes32 indexed did, ...)
      const didRegisteredEvent = receipt.events?.find(event => event.event === 'DIDRegistered');
      
      if (didRegisteredEvent) {
        // **【核心修改 4】** 从事件参数中获取正确的参数名 `did`
        const newDID = didRegisteredEvent.args.did; 
        setUserDID(newDID); // 直接更新 UI
        setMessage({ text: `DID 创建成功！您的新 DID 是: ${newDID}`, type: 'success' });
        setIpfsCid(''); // 成功后清空输入框
      } else {
        // 如果事件未找到，这可能是一个问题，但我们仍然可以提示用户成功并重新查询
        setMessage({ text: `交易成功！但未能从事件中解析到新DID，将尝试重新获取。交易哈希: ${receipt.transactionHash}`, type: 'success' });
        fetchUserDID(); // 作为备用方案，重新查询一次
      }

    } catch (error) {
      console.error("Create DID failed:", error);
      if (error.code === 4001) { // 用户拒绝交易
        setMessage({ text: '创建失败: 您已取消交易。', type: 'error' });
      } else {
        // 提供更具体的错误信息
        setMessage({ text: `创建失败: ${error.reason || error.message}`, type: 'error' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return <div className="component-placeholder">请先连接钱包以管理您的 DID。</div>;
  }

  return (
    <div className="component">
      <h2>DID 管理</h2>
      {userDID ? (
        <div className="did-display">
          <p><strong>您的 DID:</strong></p>
          {/* DID 是一个很长的十六进制字符串，使用 pre 或 code 标签可以更好地展示 */}
          <pre className="did-string">{userDID}</pre>
          {/* 这里可以添加撤销 DID 或更新 DID 关联的 IPFS CID 的功能 */}
        </div>
      ) : (
        !isLoading && <p>您还没有创建 DID。</p>
      )}

      <form onSubmit={handleCreateDID} className="did-form">
        <h3>创建新 DID</h3>
        <p>将您的个人信息（加密后）上传到 IPFS，然后将返回的 CID 填入下方。</p>
        <input
          type="text"
          placeholder="输入 IPFS CID"
          value={ipfsCid}
          onChange={(e) => setIpfsCid(e.target.value)}
          required
          // 如果已有 DID，则禁用创建功能，这符合一个地址一个DID的简单场景
          disabled={isLoading || !!userDID} 
        />
        <button type="submit" disabled={isLoading || !!userDID}>
          {isLoading ? '创建中...' : '创建 DID'}
        </button>
        {userDID && <small>您已经有一个 DID。如需创建新的，需要先实现并调用撤销功能。</small>}
      </form>
      
      {message.text && (
        <p className={`message ${message.type}`}>
          {message.text}
        </p>
      )}
    </div>
  );
};

export default DIDManagement;
