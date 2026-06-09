import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWalletClient, useAccount, useChainId } from "wagmi";
import { ADDRESSES, ERC20_ABI, STAKING_ABI } from "./contracts/config";
import { SpeedInsights } from "@vercel/speed-insights/react";
import "./App.css";

const NETWORK = { chainId: 34, name: "SCAI Mainnet" };

interface DashboardData {
  stakedAmount: string; availableReward: string; aprPercent: string;
  apyPercent: string; walletBalance: string; totalStaked: string;
}
const EMPTY_DASHBOARD: DashboardData = {
  stakedAmount:"0.00", availableReward:"0.00", aprPercent:"0.00",
  apyPercent:"0.00", walletBalance:"0.00", totalStaked:"0.00",
};
function fmt(wei: bigint, decimals = 4): string {
  return parseFloat(ethers.formatEther(wei)).toFixed(decimals);
}
function aprToApy(apr: number): number {
  return (Math.pow(1 + apr / 100 / 365, 365) - 1) * 100;
}

export default function App() {
  const { address: account, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const provider = useMemo(() => walletClient ? new ethers.BrowserProvider(walletClient.transport) : null, [walletClient]);
  const wrongNetwork = isConnected && chainId !== NETWORK.chainId;
  const [dashboard, setDashboard] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [stakeInput, setStakeInput] = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!isConnected) { setDashboard(EMPTY_DASHBOARD); setStatus(""); } }, [isConnected]);

  const loadDashboard = useCallback(async (p: ethers.BrowserProvider, addr: string) => {
    try {
      const staking = new ethers.Contract(ADDRESSES.staking, STAKING_ABI, p);
      const token = new ethers.Contract(ADDRESSES.token, ERC20_ABI, p);
      const [stakedAmount, availableReward, aprBPS] = await staking.getDashboardData(addr);
      const walletBalance = await token.balanceOf(addr);
      const totalStaked = await staking.totalStaked();
      const aprPercent = Number(aprBPS) / 100;
      setDashboard({
        stakedAmount: fmt(stakedAmount), availableReward: fmt(availableReward),
        aprPercent: aprPercent.toFixed(2), apyPercent: aprToApy(aprPercent).toFixed(2),
        walletBalance: fmt(walletBalance), totalStaked: fmt(totalStaked, 2),
      });
    } catch (e) { console.error("Dashboard load error:", e); }
  }, []);

  useEffect(() => {
    if (provider && account && !wrongNetwork) {
      loadDashboard(provider, account);
      const id = setInterval(() => loadDashboard(provider, account), 15000);
      return () => clearInterval(id);
    }
  }, [provider, account, wrongNetwork, loadDashboard]);

  async function handleStake() {
    if (!provider || !account || !stakeInput) return;
    setLoading(true); setStatus("");
    try {
      const signer = await provider.getSigner();
      const token = new ethers.Contract(ADDRESSES.token, ERC20_ABI, signer);
      const staking = new ethers.Contract(ADDRESSES.staking, STAKING_ABI, signer);
      const amount = ethers.parseEther(stakeInput);
      setStatus("Approving..."); await (await token.approve(ADDRESSES.staking, amount)).wait();
      setStatus("Staking..."); await (await staking.stake(amount)).wait();
      setStatus("Staked successfully."); setStakeInput(""); loadDashboard(provider, account);
    } catch (e: any) { setStatus(e?.reason || e?.message || "Transaction failed."); }
    setLoading(false);
  }

  async function handleWithdraw() {
    if (!provider || !account || !withdrawInput) return;
    setLoading(true); setStatus("");
    try {
      const signer = await provider.getSigner();
      const staking = new ethers.Contract(ADDRESSES.staking, STAKING_ABI, signer);
      const amount = ethers.parseEther(withdrawInput);
      setStatus("Withdrawing..."); await (await staking.withdraw(amount)).wait();
      setStatus("Withdrawn successfully."); setWithdrawInput(""); loadDashboard(provider, account);
    } catch (e: any) { setStatus(e?.reason || e?.message || "Transaction failed."); }
    setLoading(false);
  }

  async function handleClaim() {
    if (!provider || !account) return;
    setLoading(true); setStatus("");
    try {
      const signer = await provider.getSigner();
      const staking = new ethers.Contract(ADDRESSES.staking, STAKING_ABI, signer);
      setStatus("Claiming rewards..."); await (await staking.claimRewards()).wait();
      setStatus("Rewards claimed."); loadDashboard(provider, account);
    } catch (e: any) { setStatus(e?.reason || e?.message || "Transaction failed."); }
    setLoading(false);
  }

  return (
    <div className="app">
      <SpeedInsights />
      <header className="header">
        <div className="header-left">
          <span className="logo">STK</span>
          <span className="network-badge">{NETWORK.name}</span>
        </div>
        <div className="header-right"><ConnectButton /></div>
      </header>
      <section className="hero">
        <h1>Stake STK.<br />Earn rewards.</h1>
        <p className="hero-sub">Deposit tokens, accumulate yield, withdraw anytime.</p>
        {!isConnected && <p className="hero-cta-hint">Connect your wallet above to get started.</p>}
      </section>
      {wrongNetwork && (
        <div className="status-msg status-error">
          Wrong network. Please switch to {NETWORK.name} (chain ID {NETWORK.chainId}).
        </div>
      )}
      {isConnected && !wrongNetwork && (
        <>
          <section className="dashboard">
            <div className="stat-card"><span className="stat-label">Staked</span><span className="stat-value">{dashboard.stakedAmount} <span className="stat-unit">STK</span></span></div>
            <div className="stat-card highlight"><span className="stat-label">Rewards</span><span className="stat-value">{dashboard.availableReward} <span className="stat-unit">STK</span></span></div>
            <div className="stat-card"><span className="stat-label">APR</span><span className="stat-value">{dashboard.aprPercent}<span className="stat-unit">%</span></span></div>
            <div className="stat-card"><span className="stat-label">APY</span><span className="stat-value">{dashboard.apyPercent}<span className="stat-unit">%</span></span></div>
            <div className="stat-card"><span className="stat-label">Wallet Balance</span><span className="stat-value">{dashboard.walletBalance} <span className="stat-unit">STK</span></span></div>
            <div className="stat-card"><span className="stat-label">Total Staked</span><span className="stat-value">{dashboard.totalStaked} <span className="stat-unit">STK</span></span></div>
          </section>
          <section className="actions">
            <div className="action-card">
              <h2>Stake</h2>
              <div className="input-row">
                <input type="number" placeholder="Amount" value={stakeInput} onChange={e => setStakeInput(e.target.value)} disabled={loading} />
                <button className="btn-max" onClick={() => setStakeInput(dashboard.walletBalance)} disabled={loading}>MAX</button>
              </div>
              <button className="btn-action" onClick={handleStake} disabled={loading || !stakeInput}>{loading ? "Pending..." : "Stake STK"}</button>
            </div>
            <div className="action-card">
              <h2>Withdraw</h2>
              <div className="input-row">
                <input type="number" placeholder="Amount" value={withdrawInput} onChange={e => setWithdrawInput(e.target.value)} disabled={loading} />
                <button className="btn-max" onClick={() => setWithdrawInput(dashboard.stakedAmount)} disabled={loading}>MAX</button>
              </div>
              <button className="btn-action" onClick={handleWithdraw} disabled={loading || !withdrawInput}>{loading ? "Pending..." : "Withdraw STK"}</button>
            </div>
            <div className="action-card rewards-card">
              <h2>Rewards</h2>
              <div className="reward-amount">{dashboard.availableReward} <span className="stat-unit">STK</span></div>
              <p className="reward-sub">Accumulated and ready to claim</p>
              <button className="btn-action btn-claim" onClick={handleClaim} disabled={loading || dashboard.availableReward === "0.0000"}>{loading ? "Pending..." : "Claim Rewards"}</button>
            </div>
          </section>
          {status && <div className={`status-msg ${status.toLowerCase().includes("fail") || status.toLowerCase().includes("error") ? "status-error" : "status-ok"}`}>{status}</div>}
        </>
      )}
      <footer className="footer">
        <span>STK Staking</span>
        <a href={"https://explorer.scai.network/address/" + ADDRESSES.staking} target="_blank" rel="noreferrer">Contract</a>
      </footer>
    </div>
  );
}
