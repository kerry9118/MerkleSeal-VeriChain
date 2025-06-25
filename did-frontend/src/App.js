import React from 'react';
import { Web3Provider } from './context/Web3Context';
import ConnectWalletButton from './components/ConnectWalletButton';
import DIDManagement from './components/DIDManagement';
import VCApplication from './components/VCApplication';
import './App.css'; // 添加一些基础样式

function App() {
  return (
    <Web3Provider>
      <div className="App">
        <header className="App-header">
          <h1>去中心化身份 (DID) 项目</h1>
          <ConnectWalletButton />
        </header>
        <main>
          <DIDManagement />
          <hr />
          <VCApplication />
        </main>
      </div>
    </Web3Provider>
  );
}

export default App;
