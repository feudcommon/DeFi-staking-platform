import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { NETWORK, ADDRESSES, ERC20_ABI, STAKING_ABI } from "./contracts/config";
import "./App.css";

// ─── Types ────────────────────────────────────────────────
interface DashboardData {
  stakedAmount: string;
  availableReward: string;
  aprPercent: string;
  apyPercent: string;
  walletBalance: string;
  totalStaked: string;
}

const EMPTY_DASHBOARD: DashboardData = {
  stakedAmount:    "0.00",
  availableReward: "0.00",
  aprPercent:      "0.00",
  apyPercent:      "0.00",
  walletBalance:   "0.00",
  totalStaked:     "0.00",
};

// ─── Helpers ──────────────────────────────────────────────
function fmt(wei: bigint, decimals = 4): string {
  return parseFloat(ethers.formatEther(wei)).toFixed(decimals);
}

function aprToApy(aprPercent: number): number {
  return (Math.pow(1 + aprPercent / 100 / 365, 365) - 1) * 100;
}

// ─── App ──────────────────────────────────────────────────
export default function App() {
  const [account, setAccount]       = useState<string>("");
  const [provider, setProvider]     = useState<ethers.BrowserProvider | null>(null);
  const [dashboard, setDashboard]   = useState<DashboardData>(EMPTY_DASHBOARD);
  const [stakeInput, setStakeInput] = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");
  const [status, setStatus]         = useState("");
  const [loading, setLoading]       = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  // ── Network check ────────────────────────────────────────
  async function checkNetwork(p: ethers.BrowserProvider) {
    const network = await p.getNetwork();
    if (Number(network.chainId) !== NETWORK.chainId) {
      setWrongNetwork(true);
      return false;
    }
    setWrongNetwork(false);
    return true;
  }

  async function switchNetwork() {
    const eth = (window as any).ethereum;
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: NETWORK.chainIdHex }],
      });
    } catch (err: any) {
      // Chain not added yet — add it
      if (err.code === 4902) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId:           NETWORK.chainIdHex,
            chainName:         NETWORK.name,
            rpcUrls:           [NETWORK.rpcUrl],
            nativeCurrency: {
              name:     NETWORK.currencySymbol,
              symbol:   NETWORK.currencySymbol,
              decimals: NETWORK.currencyDecimals,
            },
          }],
        });
      }
    }
  }

  // ── Connect wallet ───────────────────────────────────────
  async function connectWallet() {
    const eth = (window as any).ethereum;
    if (!eth) { setStatus("MetaMask not found. Install it first."); return; }

    const p = new ethers.BrowserProvider(eth);
    const accounts = await p.send("eth_requestAccounts", []);
    const ok = await checkNetwork(p);
    if (!ok) { setProvider(p); setAccount(accounts[0]); return; }

    setProvider(p);
    setAccount(accounts[0]);
  }

  // ── Load dashboard ───────────────────────────────────────
  const loadDashboard = useCallback(async (p: ethers.BrowserProvider, addr: string) => {
    try {
      const staking = new ethers.Contract(ADDRESSES.staking, STAKING_ABI, p);
      const token   = new ethers.Contract(ADDRESSES.token,   ERC20_ABI,   p);

      const [stakedAmount, availableReward, aprBPS] =
        await staking.getDashboardData(addr);
      const walletBalance = await token.balanceOf(addr);
      const totalStaked   = await staking.totalStaked();

      const aprPercent = Number(aprBPS) / 100;
      const apyPercent = aprToApy(aprPercent);

      setDashboard({
        stakedAmount:    fmt(stakedAmount),
        availableReward: fmt(availableReward),
        aprPercent:      aprPercent.toFixed(2),
        apyPercent:      apyPercent.toFixed(2),
        walletBalance:   fmt(walletBalance),
        totalStaked:     fmt(totalStaked, 2),
      });
    } catch (e) {
      console.error("Dashboard load error:", e);
    }
  }, []);

  useEffect(() => {
    if (provider && account && !wrongNetwork) {
      loadDashboard(provider, account);
      const interval = setInterval(() => loadDashboard(provider, account), 15000);
      return () => clearInterval(interval);
    }
  }, [provider, account, wrongNetwork, loadDashboard]);

  // ── MetaMask event listeners ──────────────────────────────
  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    const onAccountChange = (accounts: string[]) => {
      setAccount(accounts[0] || "");
      setDashboard(EMPTY_DASHBOARD);
    };
    const onChainChange = () => window.location.reload();
    eth.on("accountsChanged", onAccountChange);
    eth.on("chainChanged",    onChainChange);
    return () => {
      eth.removeListener("accountsChanged", onAccountChange);
      eth.removeListener("chainChanged",    onChainChange);
    };
  }, []);

  // ── Transactions ─────────────────────────────────────────
  async function handleStake() {
    if (!provider || !stakeInput) return;
    setLoading(true); setStatus("");
    try {
      const signer  = await provider.getSigner();
      const token   = new ethers.Contract(ADDRESSES.token,   ERC20_ABI,   signer);
      const staking = new ethers.Contract(ADDRESSES.staking, STAKING_ABI, signer);
      const amount  = ethers.parseEther(stakeInput);

      setStatus("Approving...");
      const approveTx = await token.approve(ADDRESSES.staking, amount);
      await approveTx.wait();

      setStatus("Staking...");
      const stakeTx = await staking.stake(amount);
      await stakeTx.wait();

      setStatus("Staked successfully.");
      setStakeInput("");
      loadDashboard(provider, account);
    } catch (e: any) {
      setStatus(e?.reason || e?.message || "Transaction failed.");
    }
    setLoading(false);
  }

  async function handleWithdraw() {
    if (!provider || !withdrawInput) return;
    setLoading(true); setStatus("");
    try {
      const signer  = await provider.getSigner();
      const staking = new ethers.Contract(ADDRESSES.staking, STAKING_ABI, signer);
      const amount  = ethers.parseEther(withdrawInput);

      setStatus("Withdrawing...");
      const tx = await staking.withdraw(amount);
      await tx.wait();

      setStatus("Withdrawn successfully.");
      setWithdrawInput("");
      loadDashboard(provider, account);
    } catch (e: any) {
      setStatus(e?.reason || e?.message || "Transaction failed.");
    }
    setLoading(false);
  }

  async function handleClaim() {
    if (!provider) return;
    setLoading(true); setStatus("");
    try {
      const signer  = await provider.getSigner();
      const staking = new ethers.Contract(ADDRESSES.staking, STAKING_ABI, signer);

      setStatus("Claiming rewards...");
      const tx = await staking.claimRewards();
      await tx.wait();

      setStatus("Rewards claimed.");
      loadDashboard(provider, account);
    } catch (e: any) {
      setStatus(e?.reason || e?.message || "Transaction failed.");
    }
    setLoading(false);
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="logo">⬡ STK</span>
          <span className="network-badge">{NETWORK.name}</span>
        </div>
        <div className="header-right">
          {account ? (
            <div className="wallet-connected">
              <span className="dot" />
              {account.slice(0, 6)}...{account.slice(-4)}
            </div>
          ) : (
            <button className="btn-connect" onClick={connectWallet}>
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Wrong network banner */}
      {wrongNetwork && (
        <div className="banner-warning">
          Wrong network. You need to be on {NETWORK.name}.
          <button className="btn-switch" onClick={switchNetwork}>Switch Network</button>
        </div>
      )}

      {/* Hero */}
      <section className="hero">
        <h1>Stake STK.<br />Earn rewards.</h1>
        <p className="hero-sub">Deposit tokens, accumulate yield, withdraw anytime.</p>
        {!account && (
          <button className="btn-connect hero-cta" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
      </section>

      {/* Dashboard */}
      {account && !wrongNetwork && (
        <>
          <section className="dashboard">
            <div className="stat-card">
              <span className="stat-label">Staked</span>
              <span className="stat-value">{dashboard.stakedAmount} <span className="stat-unit">STK</span></span>
            </div>
            <div className="stat-card highlight">
              <span className="stat-label">Rewards</span>
              <span className="stat-value">{dashboard.availableReward} <span className="stat-unit">STK</span></span>
            </div>
            <div className="stat-card">
              <span className="stat-label">APR</span>
              <span className="stat-value">{dashboard.aprPercent}<span className="stat-unit">%</span></span>
            </div>
            <div className="stat-card">
              <span className="stat-label">APY</span>
              <span className="stat-value">{dashboard.apyPercent}<span className="stat-unit">%</span></span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Wallet Balance</span>
              <span className="stat-value">{dashboard.walletBalance} <span className="stat-unit">STK</span></span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Staked</span>
              <span className="stat-value">{dashboard.totalStaked} <span className="stat-unit">STK</span></span>
            </div>
          </section>

          {/* Actions */}
          <section className="actions">
            {/* Stake */}
            <div className="action-card">
              <h2>Stake</h2>
              <div className="input-row">
                <input
                  type="number"
                  placeholder="Amount"
                  value={stakeInput}
                  onChange={e => setStakeInput(e.target.value)}
                  disabled={loading}
                />
                <button
                  className="btn-max"
                  onClick={() => setStakeInput(dashboard.walletBalance)}
                  disabled={loading}
                >
                  MAX
                </button>
              </div>
              <button className="btn-action" onClick={handleStake} disabled={loading || !stakeInput}>
                {loading ? "Pending..." : "Stake STK"}
              </button>
            </div>

            {/* Withdraw */}
            <div className="action-card">
              <h2>Withdraw</h2>
              <div className="input-row">
                <input
                  type="number"
                  placeholder="Amount"
                  value={withdrawInput}
                  onChange={e => setWithdrawInput(e.target.value)}
                  disabled={loading}
                />
                <button
                  className="btn-max"
                  onClick={() => setWithdrawInput(dashboard.stakedAmount)}
                  disabled={loading}
                >
                  MAX
                </button>
              </div>
              <button className="btn-action" onClick={handleWithdraw} disabled={loading || !withdrawInput}>
                {loading ? "Pending..." : "Withdraw STK"}
              </button>
            </div>

            {/* Claim */}
            <div className="action-card rewards-card">
              <h2>Rewards</h2>
              <div className="reward-amount">
                {dashboard.availableReward} <span className="stat-unit">STK</span>
              </div>
              <p className="reward-sub">Accumulated and ready to claim</p>
              <button
                className="btn-action btn-claim"
                onClick={handleClaim}
                disabled={loading || dashboard.availableReward === "0.0000"}
              >
                {loading ? "Pending..." : "Claim Rewards"}
              </button>
            </div>
          </section>

          {/* Status */}
          {status && (
            <div className={`status-msg ${status.toLowerCase().includes("fail") || status.toLowerCase().includes("error") ? "status-error" : "status-ok"}`}>
              {status}
            </div>
          )}
        </>
      )}

      <footer className="footer">
        <span>STK Staking</span>
        <a href={`https://explorer.scai.network/address/${ADDRESSES.staking}`} target="_blank" rel="noreferrer">Contract ↗</a>
      </footer>
    </div>
  );
}