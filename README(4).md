# ⬡ DeFi Staking Platform

> Decentralized staking platform built on SCAI Mainnet · Solidity · React · TypeScript · Ethers.js · MetaMask

| | |
|---|---|
| **Live Demo** | [de-fi-staking-platform-vert.vercel.app](https://de-fi-staking-platform-vert.vercel.app) |
| **GitHub** | [feudcommon/DeFi-staking-platform](https://github.com/feudcommon/DeFi-staking-platform) |
| **Token Contract (SCAI)** | `0x4EF03D37c441BcF78D61367f4EE709027632d929` |
| **Staking Contract (SCAI)** | `0x9aab06FAE31e082c26979afca9E53897dB57D50C` |
| **Audit** | [EtherAuthority](https://etherauthority.io) |

---

## ✨ Features

- **Stake tokens** — Deposit ERC20 tokens into the staking contract
- **Withdraw anytime** — Retrieve staked tokens with no lock-up
- **Claim rewards** — Collect accumulated yield on demand
- **Live dashboard** — Displays staked amount, available rewards, APR, APY, and wallet balance
- **Multi-wallet support** — MetaMask, WalletConnect, and Coinbase Wallet via RainbowKit
- **Auto-approval flow** — `approve()` is called automatically before staking so users never see a confusing failure

---

## 🏗️ System Architecture

The platform is composed of five components working in sequence:

| # | Component | Role |
|---|---|---|
| 1 | User | Interacts with the application through the frontend |
| 2 | MetaMask Wallet | Manages accounts and signs transactions |
| 3 | React Frontend | UI for staking, withdrawing, and claiming rewards |
| 4 | Staking Smart Contract | Handles staking operations, reward calculations, withdrawals |
| 5 | ERC20 Token Contract | Manages token balances and transfers |

The frontend communicates with both contracts using **Ethers.js v6**.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity, Hardhat |
| Frontend | React 18, TypeScript |
| Blockchain Layer | Ethers.js v6 |
| Wallet Connectivity | RainbowKit, Wagmi, WalletConnect |
| Deployment | Vercel |
| Network | SCAI Mainnet (Chain ID: 34) |

---

## 📋 Contract Interface

| Function | Signature | Description |
|---|---|---|
| Stake Tokens | `stake(uint amount)` | Deposit ERC20 tokens into the staking contract |
| Withdraw Tokens | `Withdraw(uint amount)` | Withdraw previously staked tokens |
| Claim Rewards | `claimRewards()` | Claim accumulated reward tokens |
| Dashboard Data | `getDashboardData(address)` | Returns staked amount, rewards, and APR in one call |

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- npm or yarn
- MetaMask (or any WalletConnect-compatible wallet)
- SCAI Mainnet configured in your wallet

### Add SCAI Mainnet to MetaMask

| Field | Value |
|---|---|
| Network Name | SCAI Mainnet |
| RPC URL | `https://mainnet-rpc.scai.network` |
| Chain ID | `34` |
| Currency Symbol | `SCAI` |
| Block Explorer | `https://explorer.securechain.ai` |

### Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/feudcommon/DeFi-staking-platform.git
cd DeFi-staking-platform

# 2. Install dependencies
npm install

# 3. Start the development server
npm start
```

The app will open at `http://localhost:3000`.

---

## 📁 Repository Structure

```
DeFi-staking-platform/
├── contracts/              # Solidity smart contracts
│   ├── ERC20.sol
│   └── StakingContract.sol
├── src/                    # React frontend source
│   ├── contracts/
│   │   └── config.ts       # ABIs and contract addresses
│   ├── App.tsx
│   ├── App.css
│   └── index.tsx
├── scripts/                # Hardhat deploy scripts
├── test/                   # Contract test files
├── deployments/            # Deployment records
├── artifacts/              # Hardhat build artifacts
├── public/
│   └── index.html
├── hardhat.config.js
└── package.json
```

---

## ✅ Features Checklist

- [x] Stake tokens
- [x] Withdraw tokens
- [x] Claim rewards
- [x] View dashboard (staked amount, rewards, APR, APY, wallet balance)
- [x] Wrong network detection
- [x] ERC20 approve flow handled automatically
- [x] Transaction hash links to block explorer

---

## 🔐 Security

Smart contracts audited by [**EtherAuthority**](https://etherauthority.io).

---

## 📄 License

MIT
