// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ERC20Token
 * @dev A standard ERC20 token used for staking and rewards distribution.
 *      Implements the full ERC20 interface manually (no OpenZeppelin dependency)
 *      so the contract is self-contained and auditable.
 *
 *      The deployer receives the initial supply and is set as the owner.
 *      Only the owner can mint new tokens — this is used by the StakingContract
 *      to issue reward tokens to stakers.
 */
contract ERC20Token {

    // ─────────────────────────────────────────────
    //  State
    // ─────────────────────────────────────────────

    string  public name;
    string  public symbol;
    uint8   public  constant decimals = 18;
    uint256 public totalSupply;

    address public owner;

    mapping(address => uint256)                     public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // ─────────────────────────────────────────────
    //  Events  (ERC20 standard)
    // ─────────────────────────────────────────────

    event Transfer(address indexed from,    address indexed to,      uint256 value);
    event Approval(address indexed owner_,  address indexed spender, uint256 value);

    // ─────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "ERC20: caller is not owner");
        _;
    }

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────

    /**
     * @param _name        Human-readable token name  e.g. "Stake Token"
     * @param _symbol      Ticker symbol              e.g. "STK"
     * @param _initialSupply  Tokens minted to deployer (in whole tokens, NOT wei)
     */
    constructor(
    string memory _name,
    string memory _symbol,
    uint256 _initialSupply   // whole tokens, e.g. 1_000_000
    ) {
    name   = _name;
    symbol = _symbol;
    owner  = msg.sender;

    uint256 mintAmount    = _initialSupply * (10 ** uint256(decimals));
    totalSupply         += mintAmount;
    balanceOf[msg.sender] += mintAmount;
    emit Transfer(address(0), msg.sender, mintAmount);
    }

    // ─────────────────────────────────────────────
    //  ERC20 Core
    // ─────────────────────────────────────────────

    /**
     * @notice Transfer tokens to another address.
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @notice Approve a spender to use up to `amount` of your tokens.
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @notice Transfer tokens on behalf of `from` (requires prior approval).
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        require(currentAllowance >= amount, "ERC20: insufficient allowance");

        allowance[from][msg.sender] = currentAllowance - amount;
        _transfer(from, to, amount);
        return true;
    }

    // ─────────────────────────────────────────────
    //  Owner-only: Mint
    // ─────────────────────────────────────────────

    /**
     * @notice Mint new tokens to `to`.
     * @dev    Called by StakingContract to pay out rewards.
     *         The StakingContract address must be approved as owner, OR
     *         ownership must be transferred to the StakingContract after deployment.
     * @param to     Recipient address
     * @param amount Amount in wei (18-decimal units)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "ERC20: mint to zero address");
        totalSupply      += amount;
        balanceOf[to]    += amount;
        emit Transfer(address(0), to, amount);
    }

    // ─────────────────────────────────────────────
    //  Ownership Transfer
    // ─────────────────────────────────────────────

    /**
     * @notice Transfer contract ownership (e.g. hand minting rights to StakingContract).
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ERC20: new owner is zero address");
        owner = newOwner;
    }

    // ─────────────────────────────────────────────
    //  Internal helpers
    // ─────────────────────────────────────────────

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: transfer from zero address");
        require(to   != address(0), "ERC20: transfer to zero address");
        require(balanceOf[from] >= amount, "ERC20: insufficient balance");

        balanceOf[from] -= amount;
        balanceOf[to]   += amount;
        emit Transfer(from, to, amount);
    }
}
