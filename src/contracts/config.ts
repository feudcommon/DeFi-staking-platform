// Network & Contract Configuration
export const NETWORK = {
  chainId: 34,
  chainIdHex: "0x22",
  name: "SCAI Mainnet",
  rpcUrl: "https://mainnet-rpc.scai.network",
  currencySymbol: "SCAI",
  currencyDecimals: 18,
};

export const ADDRESSES = {
  token:   "0x4EF03D37c441BcF78D61367f4EE709027632d929",
  staking: "0x9aab06FAE31e082c26979afca9E53897dB57D50C",
};

export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

export const STAKING_ABI = [
  "function stake(uint256 amount) external",
  "function withdraw(uint256 amount) external",
  "function claimRewards() external",
  "function pendingReward(address user) view returns (uint256)",
  "function getDashboardData(address user) view returns (uint256 stakedAmount, uint256 availableReward, uint256 currentAPR_BPS, uint256 totalStakedGlobal)",
  "function totalStaked() view returns (uint256)",
  "function rewardRateBPS() view returns (uint256)",
];