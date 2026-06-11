const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StakingContract", function () {
  let token, staking;
  let owner, user1, user2;

  const INITIAL_SUPPLY = 1_000_000n;                         // whole tokens
  const REWARD_RATE_BPS = 1000n;                             // 10% APR
  const ONE_TOKEN = ethers.parseEther("1");
  const STAKE_AMOUNT = ethers.parseEther("1000");

  // ─── Helpers ────────────────────────────────────────────────────────────
  async function fastForward(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  }

  async function deployContracts() {
    [owner, user1, user2] = await ethers.getSigners();

    // 1. Deploy ERC20Token
    const Token = await ethers.getContractFactory("ERC20Token");
    token = await Token.deploy("Stake Token", "STK", INITIAL_SUPPLY);
    await token.waitForDeployment();

    // 2. Deploy StakingContract
    const Staking = await ethers.getContractFactory("StakingContract");
    staking = await Staking.deploy(await token.getAddress(), REWARD_RATE_BPS);
    await staking.waitForDeployment();

    // 3. Transfer ERC20 ownership to StakingContract so it can mint rewards
    await token.transferOwnership(await staking.getAddress());

    // 4. Fund user1 with tokens & approve staking contract
    await token.connect(owner);
    // owner still has tokens (minted in constructor before ownership transfer)
    await token.transfer(user1.address, STAKE_AMOUNT * 10n);
    await token.transfer(user2.address, STAKE_AMOUNT * 10n);

    await token.connect(user1).approve(await staking.getAddress(), ethers.MaxUint256);
    await token.connect(user2).approve(await staking.getAddress(), ethers.MaxUint256);
  }

  beforeEach(deployContracts);

  // ═══════════════════════════════════════════════════════════════════════
  // 1. DEPLOYMENT
  // ═══════════════════════════════════════════════════════════════════════
  describe("Deployment", function () {
    it("sets the correct staking token address", async function () {
      expect(await staking.stakingToken()).to.equal(await token.getAddress());
    });

    it("sets the correct reward rate BPS", async function () {
      expect(await staking.rewardRateBPS()).to.equal(REWARD_RATE_BPS);
    });

    it("sets the deployer as Owner", async function () {
      expect(await staking.Owner()).to.equal(owner.address);
    });

    it("starts with totalStaked = 0", async function () {
      expect(await staking.totalStaked()).to.equal(0);
    });

    it("reverts if token address is zero", async function () {
      const Staking = await ethers.getContractFactory("StakingContract");
      await expect(
        Staking.deploy(ethers.ZeroAddress, REWARD_RATE_BPS)
      ).to.be.revertedWith("Staking : zero token address ");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 2. STAKING
  // ═══════════════════════════════════════════════════════════════════════
  describe("stake()", function () {
    it("transfers tokens from user to contract", async function () {
      const before = await token.balanceOf(user1.address);
      await staking.connect(user1).stake(STAKE_AMOUNT);
      const after = await token.balanceOf(user1.address);
      expect(before - after).to.equal(STAKE_AMOUNT);
    });

    it("increases user stakeAmount", async function () {
      await staking.connect(user1).stake(STAKE_AMOUNT);
      const info = await staking.getStakeInfo(user1.address);
      expect(info.stakeAmount).to.equal(STAKE_AMOUNT);
    });

    it("increases totalStaked", async function () {
      await staking.connect(user1).stake(STAKE_AMOUNT);
      expect(await staking.totalStaked()).to.equal(STAKE_AMOUNT);
    });

    it("accumulates stakeAmount on multiple stakes", async function () {
      await staking.connect(user1).stake(STAKE_AMOUNT);
      await staking.connect(user1).stake(STAKE_AMOUNT);
      const info = await staking.getStakeInfo(user1.address);
      expect(info.stakeAmount).to.equal(STAKE_AMOUNT * 2n);
    });

    it("emits Staked event with correct args", async function () {
      await expect(staking.connect(user1).stake(STAKE_AMOUNT))
        .to.emit(staking, "Staked")
        .withArgs(user1.address, STAKE_AMOUNT);
    });

    it("reverts when amount is 0", async function () {
      await expect(staking.connect(user1).stake(0))
        .to.be.revertedWith("Staking : amount must be greater than 0");
    });

    it("reverts when user has insufficient allowance", async function () {
      // Remove approval
      await token.connect(user2).approve(await staking.getAddress(), 0);
      await expect(staking.connect(user2).stake(STAKE_AMOUNT))
        .to.be.revertedWith("ERC20: insufficient allowance");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 3. WITHDRAW
  // ═══════════════════════════════════════════════════════════════════════
  describe("Withdraw()", function () {
    beforeEach(async function () {
      await staking.connect(user1).stake(STAKE_AMOUNT);
    });

    it("returns tokens to user", async function () {
      const before = await token.balanceOf(user1.address);
      await staking.connect(user1).Withdraw(STAKE_AMOUNT);
      const after = await token.balanceOf(user1.address);
      expect(after - before).to.equal(STAKE_AMOUNT);
    });

    it("decreases user stakeAmount", async function () {
      await staking.connect(user1).Withdraw(STAKE_AMOUNT);
      const info = await staking.getStakeInfo(user1.address);
      expect(info.stakeAmount).to.equal(0);
    });

    it("decreases totalStaked", async function () {
      await staking.connect(user1).Withdraw(STAKE_AMOUNT);
      expect(await staking.totalStaked()).to.equal(0);
    });

    it("allows partial withdrawal", async function () {
      const half = STAKE_AMOUNT / 2n;
      await staking.connect(user1).Withdraw(half);
      const info = await staking.getStakeInfo(user1.address);
      expect(info.stakeAmount).to.equal(half);
    });

    it("emits Withdrawn event with correct args", async function () {
      await expect(staking.connect(user1).Withdraw(STAKE_AMOUNT))
        .to.emit(staking, "Withdrawn")
        .withArgs(user1.address, STAKE_AMOUNT);
    });

    it("reverts when amount is 0", async function () {
      await expect(staking.connect(user1).Withdraw(0))
        .to.be.revertedWith("Staking : amount must be greater than 0");
    });

    it("reverts when withdrawing more than staked", async function () {
      await expect(staking.connect(user1).Withdraw(STAKE_AMOUNT + 1n))
        .to.be.revertedWith("Staking : insufficient staked balance");
    });

    it("reverts when user has never staked", async function () {
      await expect(staking.connect(user2).Withdraw(STAKE_AMOUNT))
        .to.be.revertedWith("Staking : insufficient staked balance");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 4. REWARDS — pendingReward() & claimRewards()
  // ═══════════════════════════════════════════════════════════════════════
  describe("Rewards", function () {
    beforeEach(async function () {
      await staking.connect(user1).stake(STAKE_AMOUNT);
    });

    it("pendingReward is 0 immediately after staking", async function () {
      // same block → elapsed ≈ 0
      expect(await staking.pendingReward(user1.address)).to.equal(0);
    });

    it("pendingReward grows after time passes", async function () {
      await fastForward(3600); // 1 hour
      const reward = await staking.pendingReward(user1.address);
      expect(reward).to.be.gt(0);
    });

    it("pendingReward is 0 for a user who never staked", async function () {
      expect(await staking.pendingReward(user2.address)).to.equal(0);
    });

    it("reward scales correctly with time (10% APR check)", async function () {
      const SECONDS_PER_YEAR = 365n * 24n * 3600n;
      await fastForward(Number(SECONDS_PER_YEAR));

      const reward = await staking.pendingReward(user1.address);
      // Expected: STAKE_AMOUNT × 10% = 100 tokens (in wei)
      const expected = (STAKE_AMOUNT * REWARD_RATE_BPS) / 10_000n;
      // Allow ±1 second drift from mining
      expect(reward).to.be.closeTo(expected, ethers.parseEther("0.01"));
    });

    it("claimRewards mints tokens to user", async function () {
      await fastForward(86400); // 1 day
      const before = await token.balanceOf(user1.address);
      await staking.connect(user1).claimRewards();
      const after = await token.balanceOf(user1.address);
      expect(after).to.be.gt(before);
    });

    it("claimRewards resets pendingRewards to 0", async function () {
      await fastForward(86400);
      await staking.connect(user1).claimRewards();
      // After claim, pending should be ~0 (only tiny amount from claim tx itself)
      const pending = await staking.pendingReward(user1.address);
      expect(pending).to.be.lt(ethers.parseEther("0.0001"));
    });

    it("claimRewards increases rewardDebt", async function () {
      await fastForward(86400);
      const rewardBefore = await staking.pendingReward(user1.address);
      await staking.connect(user1).claimRewards();
      const info = await staking.getStakeInfo(user1.address);
      expect(info.rewardDebt).to.be.gte(rewardBefore);
    });

    it("emits RewardsClaimed event", async function () {
      await fastForward(86400);
      await expect(staking.connect(user1).claimRewards())
        .to.emit(staking, "RewardsClaimed");
    });

   it("reverts claimRewards when no rewards available", async function () {
  // User2 never staked — guaranteed zero rewards
  await expect(staking.connect(user2).claimRewards())
    .to.be.revertedWith("Staking: no rewards to claim");
});

it("rewards stop accumulating after full withdrawal", async function () {
  await fastForward(3600);
  await staking.connect(user1).claimRewards();
  await staking.connect(user1).Withdraw(STAKE_AMOUNT);

  // Fast forward a long time
  await fastForward(365 * 24 * 3600);

  // Get stakeInfo — stakeAmount must be 0
  const info = await staking.getStakeInfo(user1.address);
  expect(info.stakeAmount).to.equal(0n);

  // The tiny residual in pendingRewards comes from the withdrawal tx itself
  // but no NEW rewards accumulate — confirm fresh reward calculation is 0
  const freshReward = info.pendingRewards;
  const rewardAfterYear = await staking.pendingReward(user1.address);

  // Both should be identical — no growth over 1 year means staking stopped
  expect(rewardAfterYear).to.equal(freshReward);
});
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 5. DASHBOARD & STAKE INFO VIEWS
  // ═══════════════════════════════════════════════════════════════════════
  describe("getDashboardData() & getStakeInfo()", function () {
    beforeEach(async function () {
      await staking.connect(user1).stake(STAKE_AMOUNT);
      await staking.connect(user2).stake(STAKE_AMOUNT);
    });

    it("getDashboardData returns correct stakeAmount", async function () {
      const data = await staking.getDashboardData(user1.address);
      expect(data.stakeAmount).to.equal(STAKE_AMOUNT);
    });

    it("getDashboardData returns correct totalStakedGlobal", async function () {
      const data = await staking.getDashboardData(user1.address);
      expect(data.totalStakedGlobal).to.equal(STAKE_AMOUNT * 2n);
    });

    it("getDashboardData returns correct APR BPS", async function () {
      const data = await staking.getDashboardData(user1.address);
      expect(data.currentAPR_BPS).to.equal(REWARD_RATE_BPS);
    });

    it("getDashboardData availableReward grows with time", async function () {
      await fastForward(86400);
      const data = await staking.getDashboardData(user1.address);
      expect(data.availableReward).to.be.gt(0);
    });

    it("getStakeInfo returns all fields correctly", async function () {
      const info = await staking.getStakeInfo(user1.address);
      expect(info.stakeAmount).to.equal(STAKE_AMOUNT);
      expect(info.rewardDebt).to.equal(0);
      expect(info.lastUpdateTime).to.be.gt(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 6. OWNER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════
  describe("Owner Functions", function () {
    describe("setRewardRate()", function () {
      it("owner can update reward rate", async function () {
        await staking.connect(owner).setRewardRate(2000);
        expect(await staking.rewardRateBPS()).to.equal(2000);
      });

      it("emits RewardRateSet event", async function () {
        await expect(staking.connect(owner).setRewardRate(2000))
          .to.emit(staking, "RewardRateSet")
          .withArgs(REWARD_RATE_BPS, 2000);
      });

      it("non-owner cannot set reward rate", async function () {
        await expect(staking.connect(user1).setRewardRate(2000))
          .to.be.revertedWith("Staking: caller is not owner");
      });
    });

    describe("pauseRewards()", function () {
      it("sets reward rate to 0", async function () {
        await staking.connect(owner).pauseRewards();
        expect(await staking.rewardRateBPS()).to.equal(0);
      });

      it("stops reward accumulation after pause", async function () {
        await staking.connect(user1).stake(STAKE_AMOUNT);
        await staking.connect(owner).pauseRewards();
        await fastForward(86400);
        expect(await staking.pendingReward(user1.address)).to.equal(0);
      });

      it("non-owner cannot pause rewards", async function () {
        await expect(staking.connect(user1).pauseRewards())
          .to.be.revertedWith("Staking: caller is not owner");
      });
    });

    describe("transferOwnership()", function () {
      it("transfers ownership to new address", async function () {
        await staking.connect(owner).transferOwnership(user1.address);
        expect(await staking.Owner()).to.equal(user1.address);
      });

      it("reverts when new owner is zero address", async function () {
        await expect(staking.connect(owner).transferOwnership(ethers.ZeroAddress))
          .to.be.revertedWith("Staking: zero address");
      });

      it("non-owner cannot transfer ownership", async function () {
        await expect(staking.connect(user1).transferOwnership(user2.address))
          .to.be.revertedWith("Staking: caller is not owner");
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 7. MULTI-USER SCENARIOS
  // ═══════════════════════════════════════════════════════════════════════
  describe("Multi-user scenarios", function () {
    it("two users stake independently and earn separate rewards", async function () {
      await staking.connect(user1).stake(STAKE_AMOUNT);
      await fastForward(3600);
      await staking.connect(user2).stake(STAKE_AMOUNT * 2n); // double stake
      await fastForward(3600);

      const reward1 = await staking.pendingReward(user1.address);
      const reward2 = await staking.pendingReward(user2.address);

      // user1 staked longer → more rewards despite smaller stake
      expect(reward1).to.be.gt(reward2);
    });

    it("one user claiming does not affect another's rewards", async function () {
      await staking.connect(user1).stake(STAKE_AMOUNT);
      await staking.connect(user2).stake(STAKE_AMOUNT);
      await fastForward(86400);

      const reward2Before = await staking.pendingReward(user2.address);
      await staking.connect(user1).claimRewards(); // user1 claims

      const reward2After = await staking.pendingReward(user2.address);
      // user2 reward should only grow (from additional block), never drop
      expect(reward2After).to.be.gte(reward2Before);
    });

    it("totalStaked updates correctly across multiple users", async function () {
      await staking.connect(user1).stake(STAKE_AMOUNT);
      await staking.connect(user2).stake(STAKE_AMOUNT * 2n);
      expect(await staking.totalStaked()).to.equal(STAKE_AMOUNT * 3n);

      await staking.connect(user1).Withdraw(STAKE_AMOUNT);
      expect(await staking.totalStaked()).to.equal(STAKE_AMOUNT * 2n);
    });
  });
});