import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import { create } from 'ipfs-http-client';
import { MerkleTree } from 'merkletreejs';
// 修正：移除了 "import keccak256 from 'keccak266';" 因为 ethers.js 已提供该功能，且代码中已在使用 ethers.keccak256

// 导入合约信息
import contractAddresses from '../contracts/contract-address.json';
import VCRegistryABI from '../contracts/VCRegistry.json';

// 1. IPFS 连接
const projectId = process.env.REACT_APP_INFURA_IPFS_PROJECT_ID;
const projectSecret = process.env.REACT_APP_INFURA_IPFS_PROJECT_SECRET;
if (!projectId || !projectSecret) {
  console.error("错误：在 .env 文件中未找到 Infura 项目 ID/密钥。");
}
// 修正: 使用浏览器原生的 btoa() 函数替代 Node.js 的 Buffer
// The btoa() function encodes a string in Base64. It's the browser-native equivalent
// for the Buffer.from(str).toString('base64') pattern from Node.js.
const auth = 'Basic ' + btoa(projectId + ':' + projectSecret);
const ipfs = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: auth,
  },
});

// CredentialForm 组件 (已翻译)
const CredentialForm = ({ onAdd }) => {
  const [formData, setFormData] = useState({ userDid: '', name: '', degree: 'Bachelor' });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddClick = () => {
    if (formData.userDid && formData.name) {
      onAdd(formData);
      setFormData({ userDid: '', name: '', degree: 'Bachelor' }); // 重置表单
    } else {
      alert('请输入接收者 DID 和姓名。');
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '20px' }}>
      <h4>添加凭证到批次</h4>
      <input type="text" name="userDid" placeholder="接收者 DID" value={formData.userDid} onChange={handleInputChange} />
      <input type="text" name="name" placeholder="接收者姓名" value={formData.name} onChange={handleInputChange} />
      <select name="degree" value={formData.degree} onChange={handleInputChange}>
        <option value="Bachelor">学士</option>
        <option value="Master">硕士</option>
        <option value="Doctorate">博士</option>
      </select>
      <button onClick={handleAddClick}>添加到批次</button>
    </div>
  );
};


const VCApplication = () => {
  const { signer, account, isConnected } = useWeb3();
  const [vcRegistryContract, setVcRegistryContract] = useState(null);
  const [credentialsToIssue, setCredentialsToIssue] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (signer) {
      const contract = new ethers.Contract(
        contractAddresses.VCRegistry,
        VCRegistryABI.abi,
        signer
      );
      setVcRegistryContract(contract);
    }
  }, [signer]);

  const addCredentialToBatch = (credentialData) => {
    setCredentialsToIssue([...credentialsToIssue, credentialData]);
  };

  const handleIssueBatch = async () => {
    if (!vcRegistryContract) {
      alert("请连接您的钱包。");
      return;
    }
    if (credentialsToIssue.length === 0) {
      alert("请至少向批次中添加一个凭证。");
      return;
    }

    setIsLoading(true);
    setMessage('正在处理批次：准备数据并计算哈希值...');

    try {
      const leaves = await Promise.all(credentialsToIssue.map(async (data) => {
        const credential = {
          '@context': 'https://www.w3.org/2018/credentials/v1',
          type: ['VerifiableCredential', 'EducationCredential'],
          issuer: `did:ethr:${account}`, // 颁发者 DID
          issuanceDate: new Date().toISOString(), // 颁发日期
          credentialSubject: {
            id: data.userDid, // 凭证主体的 DID
            name: data.name,
            degree: data.degree,
          },
        };
        
        const credentialJson = JSON.stringify(credential);
        
        // 使用 ethers.keccak256 计算叶子节点，无需额外导入库
        return ethers.keccak256(ethers.toUtf8Bytes(credentialJson));
      }));

      setMessage('正在构建默克尔树并获取根哈希...');

      // 使用 ethers.keccak256 作为哈希函数构建树
      const tree = new MerkleTree(leaves, ethers.keccak256, { sortPairs: true });
      const merkleRoot = tree.getHexRoot();
      setMessage(`默克尔树根哈希: ${merkleRoot}。正在发送交易以颁发批次...`);

      const tx = await vcRegistryContract.issueBatchCredentials(merkleRoot);
      await tx.wait();

      setMessage(`批次颁发成功！交易哈希: ${tx.hash}。默克尔树根哈希: ${merkleRoot}`);
      
      setCredentialsToIssue([]); // 清空已颁发的凭证列表

      console.log('默克尔树:', tree.toString());
      credentialsToIssue.forEach((cred, index) => {
          const leaf = leaves[index];
          const proof = tree.getHexProof(leaf);
          console.log(`为 ${cred.name} (叶子节点: ${leaf}) 生成的证明:`, proof);
      });

    } catch (error) {
      console.error("批次颁发失败:", error);
      if (error.message && error.message.includes('project id required')) {
          setMessage(`颁发失败：IPFS 认证错误。请检查您的 .env 文件。`);
      } else {
          setMessage(`颁发失败：${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return <div>请连接您的钱包。此界面供凭证颁发者使用。</div>;
  }

  return (
    <div className="component">
      <h2>批量颁发可验证凭证</h2>
      <p>此界面供授权颁发者添加多个凭证，并通过单笔批处理交易进行颁发。</p>
      
      <CredentialForm onAdd={addCredentialToBatch} />

      <h3>当前批次中的凭证 ({credentialsToIssue.length})</h3>
      <ul>
        {credentialsToIssue.map((cred, index) => (
          <li key={index}>{cred.name} ({cred.degree}) - 目标 DID: {cred.userDid}</li>
        ))}
      </ul>

      <button onClick={handleIssueBatch} disabled={isLoading || credentialsToIssue.length === 0}>
        {isLoading ? '处理中...' : `颁发 ${credentialsToIssue.length} 个凭证的批次`}
      </button>

      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default VCApplication;
