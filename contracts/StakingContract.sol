//SPDX-License-Identifier: MIT
pragma solidity^0.8.19;

interface IERC20{
    function transferFrom(address from,address to,uint256 amount)external returns(bool);
    function transfer(address to,uint256 amount) external returns(bool);
    function balanceOf(address account)external view returns(uint256);
    function mint(address to,uint256 amount) external; 
}
/**
 * @title  StakingContract
 * @notice Allows users to stake ERC20 tokens and earn time-based rewards.
 *
 * ─── Reward Model ───────────────────────────────────────────────────────────
 *  Rewards accumulate every second based on a configurable annual rate (APR).
 *
 *  pending reward = stakedAmount × rewardRatePerSecond × secondsElapsed
 *
 *  rewardRatePerSecond = APR_BPS / (365 days in seconds × 10_000)
 *
 *  Example: 10 % APR → rewardRatePerSecond ≈ 3.17e-9 tokens per token per second
 *
 *  Rewards are minted fresh from the ERC20Token contract (inflationary model).
 *  Alternatively, the contract can be pre-funded with reward tokens — see
 *  the `fundRewards` function.
 *
 * ─── Deployment Checklist ────────────────────────────────────────────────────
 *  1. Deploy ERC20Token  →  get tokenAddress
 *  2. Deploy StakingContract(tokenAddress, 1000)   // 1000 bps = 10 % APR
 *  3. Call token.transferOwnership(stakingContractAddress) so rewards can mint
 *
 * ─── Use Cases Covered (from Requirements doc) ──────────────────────────────
 *  UC1  Stake Tokens     →  stake(uint amount)
 *  UC2  View Rewards     →  pendingReward(address user)  [view, free]
 *  UC3  Claim Rewards    →  claimRewards()
 *  UC4  Withdraw Stake   →  withdraw(uint amount)
 */
contract StakingContract{
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    IERC20 public immutable stakingToken;

    address public Owner;
    //100bps = 1% 
    uint256 public rewardRateBPS;
    struct StakeInfo{
        uint256 stakeAmount;//tokens currently Staked
        uint256 rewardDebt;//rewards already claimed
        uint256 lastUpdateTime;//timpestamp of last stake/claim withdraw
        uint256 pendingRewards;
    }
    mapping(address => StakeInfo) private _stakes;

    uint256 public totalStaked;

    event Staked (address indexed user, uint256 amount);
    event Withdrawn (address indexed user, uint256 amount);
    event RewardsClaimed (address indexed user, uint256 reward);
    event RewardRateSet (uint256 oldRate, uint256 newRate);

    modifier onlyOwner() {
        require(msg.sender == Owner, "Staking: caller is not owner");
        _;
    }

    modifier updateReward(address user) {
        _snapshotReward(user);
        _;
    }

    constructor(address _token,uint256 _rewardRateBPS){
        require(_token!=address(0),"Staking : zero token address ");
        stakingToken = IERC20(_token);
        rewardRateBPS = _rewardRateBPS;
        Owner = msg.sender;
    }

    function stake(uint256 amount) external updateReward(msg.sender){
        require (amount>0,"Staking : amount must be greater than 0");
        bool ok = stakingToken.transferFrom(msg.sender , address(this) , amount);
        require(ok,"Staking : transferFrom failed");

        _stakes[msg.sender].stakeAmount += amount;
        totalStaked += amount;
        emit Staked(msg.sender, amount);
    }

    function Withdraw(uint256 amount) external updateReward(msg.sender){
        StakeInfo storage info = _stakes[msg.sender];
        require (amount>0,"Staking : amount must be greater than 0");
        require(info.stakeAmount >= amount,"Staking : insufficient staked balance");

        info.stakeAmount -= amount;
        totalStaked -= amount;
        bool ok = stakingToken.transfer(msg.sender, amount);
        require(ok, "Staking: transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Claim all accumulated reward tokens.
     *         Rewards are minted from the ERC20Token contract.
     */
    function claimRewards() external updateReward(msg.sender) {
        StakeInfo storage info = _stakes[msg.sender];
        uint256 reward = info.pendingRewards;

        require(reward > 0, "Staking: no rewards to claim");

        info.pendingRewards = 0;
        info.rewardDebt    += reward;

        // Mint reward tokens directly to user
        // Requires StakingContract to own / have minting rights on ERC20Token
        stakingToken.mint(msg.sender, reward);

        emit RewardsClaimed(msg.sender, reward);
    }

     /**
     * @notice Returns the total pending (unclaimed) reward for `user`.
     *         Includes rewards that haven't been snapshotted yet.
     * @param  user  Wallet address to query
     * @return Total claimable reward in wei
     */
    function pendingReward(address user) external view returns (uint256) {
        StakeInfo storage info = _stakes[user];

        uint256 freshReward = _calculateReward(
            info.stakeAmount,
            info.lastUpdateTime
        );

        return info.pendingRewards + freshReward;
    }

    //Frontend Requuirements

    function getDashboardData(address user)
    external
    view
    returns(
        uint256 stakeAmount,
        uint256 availableReward,
        uint256 currentAPR_BPS,
        uint256 totalStakedGlobal)
        {
            StakeInfo storage info = _stakes[user];
            stakeAmount      = info.stakeAmount;
            availableReward   = info.pendingRewards + _calculateReward(info.stakeAmount, info.lastUpdateTime);
            currentAPR_BPS    = rewardRateBPS;
            totalStakedGlobal = totalStaked;
        }

    function getStakeInfo(address user)
    external view 
    returns(
        uint256 stakeAmount,
        uint256 rewardDebt,
        uint256 lastUpdateTime,
        uint256 pendingRewards)
        {
            StakeInfo storage info = _stakes[user];
            return (
            info.stakeAmount,
            info.rewardDebt,
            info.lastUpdateTime,
            info.pendingRewards + _calculateReward(info.stakeAmount, info.lastUpdateTime)
        );
        }
    
    function setRewardRate(uint256 newRateBPS) external onlyOwner{
        emit RewardRateSet(rewardRateBPS,newRateBPS);
        rewardRateBPS=newRateBPS;
    }
    function pauseRewards() external onlyOwner {
        emit RewardRateSet(rewardRateBPS, 0);
        rewardRateBPS = 0;
    }
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Staking: zero address");
        Owner = newOwner;
    }

    function _snapshotReward(address user) internal{
        StakeInfo storage info =_stakes[user];
        uint256 fresh = _calculateReward(info.stakeAmount,info.lastUpdateTime);
        info.pendingRewards += fresh;
        info.lastUpdateTime = block.timestamp;
    }
    /**
     * @dev Pure reward calculation.
     *      reward = stakedAmount × rewardRateBPS × secondsElapsed
     *               ─────────────────────────────────────────────
     *               SECONDS_PER_YEAR × BPS_DENOMINATOR
     *
     *      Integer division is safe here because staked amounts are in 1e18 units,
     *      giving plenty of precision before the division truncates.
     *
     * @param  stakedAmount    User's staked balance (wei)
     * @param  lastUpdateTime  Timestamp of last snapshot
     * @return Reward in wei
     */
    function _calculateReward(uint256 stakedAmount, uint256 lastUpdateTime)
        internal
        view
        returns (uint256)
    {
        if (stakedAmount == 0 || lastUpdateTime == 0) return 0;

        uint256 elapsed = block.timestamp - lastUpdateTime;
        return (stakedAmount * rewardRateBPS * elapsed) / (SECONDS_PER_YEAR * BPS_DENOMINATOR);
    }
}