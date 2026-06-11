// src/contracts/config.ts

export const ADDRESSES = {
  token:   "0x4EF03D37c441BcF78D61367f4EE709027632d929",
  staking: "0x9aab06FAE31e082c26979afca9E53897dB57D50C",
};

export const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

export const STAKING_ABI = [
  "function getDashboardData(address user) view returns (uint256 stakedAmount, uint256 availableReward, uint256 aprBPS)",
  "function totalStaked() view returns (uint256)",
  "function stake(uint256 amount)",
  "function withdraw(uint256 amount)",
  "function claimRewards()",
];