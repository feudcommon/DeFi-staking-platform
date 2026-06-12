# Smart Contract Deployment

## Contracts
- ERC20Token.sol - the token users stake and earn as rewards
- StakingContract.sol - handles staking logic, reward calculation, withdrawals

## Deployment Steps

Step 1: Deploy ERC20Token
- Name: "Stake Token"
- Symbol: "STK"
- Supply: 1000000
- Save the deployed address as TOKEN_ADDRESS

Step 2: Deploy StakingContract
- Pass TOKEN_ADDRESS into the constructor
- Pass 1000 for the reward rate (10% APR)
- Save the deployed address as STAKING_ADDRESS

Step 3: Transfer Ownership
- On ERC20Token call transferOwnership(STAKING_ADDRESS)
- This gives StakingContract permission to mint reward tokens

## Contract Functions

ERC20Token
- approve(spender, amount) - user approves staking contract before staking
- balanceOf(address) - returns wallet token balance
- mint(to, amount) - owner only, called by StakingContract for rewards

StakingContract
- stake(amount) - deposit tokens
- withdraw(amount) - retrieve staked tokens
- claimRewards() - receive accumulated reward tokens
- pendingReward(user) - view current reward balance
- getDashboardData(user) - returns staked amount, reward, APR, total staked

## Frontend Integration

APR / APY
```typescript
const aprPercent = rewardRateBPS / 100
const apy = (Math.pow(1 + aprPercent / 100 / 365, 365) - 1) * 100
```

Staking Flow
```typescript
// 1. Approve
const approveTx = await tokenContract.approve(STAKING_ADDRESS, amount)
await approveTx.wait()

// 2. Stake
const stakeTx = await stakingContract.stake(amount)
await stakeTx.wait()

// 3. Read dashboard
const [staked, reward, aprBPS, tvl] = await stakingContract.getDashboardData(userAddress)
```

## Security
- Rewards calculated on-chain using block.timestamp
- Rewards snapshotted before every balance change
- transferFrom requires user approval before tokens can be pulled
- Owner can pause rewards by setting rate to 0
