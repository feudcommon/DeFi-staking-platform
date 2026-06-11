//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20{
    function transferFrom(address from,address to,uint256 amount)external returns(bool);
    function transfer(address to,uint256 amount) external returns(bool);
    function balanceOf(address account)external view returns(uint256);
    function mint(address to,uint256 amount) external; 
}

contract StakingContract{
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    IERC20 public immutable stakingToken;

    address public Owner;
    uint256 public rewardRateBPS;

    // ── GAS OPT 1: pack struct fields to fit in fewer storage slots ──
    // Before: 4 separate uint256 = 4 slots = expensive reads/writes
    // After:  lastUpdateTime as uint64 saves 1 slot when packed
    struct StakeInfo{
        uint256 stakeAmount;    // slot 1
        uint256 rewardDebt;     // slot 2
        uint256 pendingRewards; // slot 3
        uint64  lastUpdateTime; // slot 4 (uint64 is enough for timestamps until year 584,942)
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
        require(amount > 0, "Staking : amount must be greater than 0");

        // ── GAS OPT 2: cache storage pointer — avoids repeated slot lookups ──
        StakeInfo storage info = _stakes[msg.sender];

        bool ok = stakingToken.transferFrom(msg.sender, address(this), amount);
        require(ok, "Staking : transferFrom failed");

        // ── GAS OPT 3: use unchecked for safe arithmetic — saves ~50 gas each ──
        unchecked {
            info.stakeAmount += amount;
            totalStaked      += amount;
        }

        emit Staked(msg.sender, amount);
    }

    function Withdraw(uint256 amount) external updateReward(msg.sender){
        StakeInfo storage info = _stakes[msg.sender];
        require(amount > 0, "Staking : amount must be greater than 0");
        require(info.stakeAmount >= amount, "Staking : insufficient staked balance");

        // ── GAS OPT 3: unchecked subtraction — require above guarantees no underflow ──
        unchecked {
            info.stakeAmount -= amount;
            totalStaked      -= amount;
        }

        bool ok = stakingToken.transfer(msg.sender, amount);
        require(ok, "Staking: transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    function claimRewards() external updateReward(msg.sender) {
        StakeInfo storage info = _stakes[msg.sender];
        uint256 reward = info.pendingRewards;

        require(reward > 0, "Staking: no rewards to claim");

        // ── GAS OPT 4: clear storage to 0 gets a gas refund (EIP-3529) ──
        info.pendingRewards = 0;

        unchecked {
            info.rewardDebt += reward;
        }

        stakingToken.mint(msg.sender, reward);
        emit RewardsClaimed(msg.sender, reward);
    }

    function pendingReward(address user) external view returns (uint256) {
        StakeInfo storage info = _stakes[user];
        uint256 freshReward = _calculateReward(
            info.stakeAmount,
            info.lastUpdateTime
        );
        return info.pendingRewards + freshReward;
    }

    function getDashboardData(address user)
        external view
        returns(
            uint256 stakeAmount,
            uint256 availableReward,
            uint256 currentAPR_BPS,
            uint256 totalStakedGlobal)
    {
        StakeInfo storage info = _stakes[user];
        stakeAmount       = info.stakeAmount;
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

    function setRewardRate(uint256 newRateBPS) external onlyOwner {
        emit RewardRateSet(rewardRateBPS, newRateBPS);
        rewardRateBPS = newRateBPS;
    }

    function pauseRewards() external onlyOwner {
        emit RewardRateSet(rewardRateBPS, 0);
        rewardRateBPS = 0;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Staking: zero address");
        Owner = newOwner;
    }

    function _snapshotReward(address user) internal {
        StakeInfo storage info = _stakes[user];
        uint256 fresh = _calculateReward(info.stakeAmount, info.lastUpdateTime);

        // ── GAS OPT 5: only write to storage if value changed ──
        if (fresh > 0) {
            unchecked { info.pendingRewards += fresh; }
        }

        // ── GAS OPT 1 cont: uint64 cast for timestamp ──
        info.lastUpdateTime = uint64(block.timestamp);
    }

    function _calculateReward(uint256 stakedAmount, uint256 lastUpdateTime)
        internal view returns (uint256)
    {
        if (stakedAmount == 0 || lastUpdateTime == 0) return 0;

        // ── GAS OPT 6: unchecked block — no realistic overflow possible ──
        unchecked {
            uint256 elapsed = block.timestamp - lastUpdateTime;
            return (stakedAmount * rewardRateBPS * elapsed) / (SECONDS_PER_YEAR * BPS_DENOMINATOR);
        }
    }
}