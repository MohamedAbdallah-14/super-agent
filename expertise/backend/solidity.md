# Solidity Smart Contracts — Expertise Module

> Solidity is the dominant language for EVM-compatible smart contracts, securing over $50B in DeFi TVL across Ethereum, Arbitrum, Optimism, Base, and Polygon. The immutability of deployed bytecode and direct custody of user funds make correctness non-negotiable -- major exploits include The DAO ($60M, 2016), Poly Network ($611M, 2021), Wormhole ($320M, 2022), Ronin Bridge ($625M, 2022), and Euler Finance ($197M, 2023). This module covers Solidity 0.8.x+ with OpenZeppelin Contracts 5.x patterns, Foundry-first testing, gas optimization, upgrade safety, and DeFi primitives.

---

## Language Fundamentals

### Compiler Version Pinning

Always pin to an exact compiler version. Floating pragmas introduce non-deterministic compilation:

```solidity
// CORRECT -- pinned version
pragma solidity 0.8.28;

// WRONG -- floating pragma, different compilers produce different bytecode
pragma solidity ^0.8.0;
```

### Built-In Overflow Protection (0.8.x+)

Solidity 0.8.0+ reverts on arithmetic overflow/underflow by default. Use `unchecked` blocks only where overflow is provably impossible (e.g., loop counters):

```solidity
uint256 total = a + b; // Reverts if a + b > type(uint256).max

unchecked {
    ++i; // Loop counter bounded by array length
}
```

### Custom Errors Over Require Strings

Custom errors save ~200 gas per revert and enable structured error data:

```solidity
error InsufficientBalance(address account, uint256 requested, uint256 available);
error Unauthorized(address caller);
error ZeroAddress();

function withdraw(uint256 amount) external {
    if (msg.sender != owner) revert Unauthorized(msg.sender);
    if (balances[msg.sender] < amount) {
        revert InsufficientBalance(msg.sender, amount, balances[msg.sender]);
    }
}
```

### Visibility Modifiers

| Modifier | Access | Use case |
|----------|--------|----------|
| `external` | Only from outside | Public API entry points |
| `public` | External + internal | Getters, shared logic |
| `internal` | This contract + children | Inheritance hooks |
| `private` | This contract only | Implementation details |

Prefer `external` over `public` for functions not called internally -- `external` reads `calldata` directly, avoiding a memory copy.

### Storage, Memory, Calldata

| Location | Persistence | Cost | When to use |
|----------|-------------|------|-------------|
| `storage` | Permanent (on-chain) | 20,000 gas (cold write) | State variables |
| `memory` | Function scope | ~3 gas per word | Local computation, return values |
| `calldata` | Read-only, function scope | Cheapest | External function parameters |

```solidity
function processNames(string[] calldata names) external pure returns (uint256) {
    return names.length; // calldata -- cheapest for read-only external params
}
```

### Immutable and Constant

```solidity
uint256 constant MAX_SUPPLY = 1_000_000e18;  // Compile-time, inlined (zero storage cost)

address immutable i_owner;   // Set once in constructor, stored in bytecode
IERC20 immutable i_token;

constructor(address token_) {
    i_owner = msg.sender;
    i_token = IERC20(token_);
}
```

Convention: prefix immutables with `i_` and constants with `UPPER_SNAKE_CASE`.

---

## ERC Standard Patterns

### ERC-20: Fungible Tokens

```solidity
interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}
```

Minimal implementation using OpenZeppelin:

```solidity
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    uint256 constant MAX_SUPPLY = 100_000_000e18;

    constructor() ERC20("MyToken", "MTK") Ownable(msg.sender) {
        _mint(msg.sender, MAX_SUPPLY);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        if (totalSupply() + amount > MAX_SUPPLY) revert ExceedsMaxSupply();
        _mint(to, amount);
    }
}
```

### ERC-721: Non-Fungible Tokens

Key functions: `ownerOf`, `safeTransferFrom`, `approve`, `setApprovalForAll`. Always use `_safeMint` to check `IERC721Receiver` on contract recipients:

```solidity
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MyNFT is ERC721, Ownable {
    uint256 private _nextTokenId;

    constructor() ERC721("MyNFT", "MNFT") Ownable(msg.sender) {}

    function safeMint(address to) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId;
        unchecked { ++_nextTokenId; }
        _safeMint(to, tokenId);
        return tokenId;
    }
}
```

### ERC-1155: Multi-Token Standard

Combines fungible and non-fungible tokens with batch operations:

```solidity
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract GameItems is ERC1155, Ownable {
    uint256 public constant GOLD = 0;     // Fungible
    uint256 public constant SWORD = 1;    // Non-fungible (mint qty 1)

    constructor() ERC1155("https://api.game.com/items/{id}.json") Ownable(msg.sender) {}

    function mintBatch(
        address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data
    ) external onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }
}
```

### ERC-4626: Tokenized Vault

Standard interface for yield-bearing vaults -- deposit underlying asset, receive shares:

```solidity
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract YieldVault is ERC4626 {
    constructor(IERC20 asset_) ERC4626(asset_) ERC20("Yield Vault Shares", "yvTKN") {}
    // Inherited: deposit(), withdraw(), convertToShares(), convertToAssets(), totalAssets()
}
```

---

## Gas Optimization

| Pattern | Gas Saved | Mechanism |
|---------|-----------|-----------|
| Storage packing | 20,000/slot | Pack variables into 32-byte slots |
| `calldata` over `memory` | 200-600/call | Avoid memory copy for external params |
| Custom errors | 200+/revert | No string encoding/storage |
| Unchecked math | 80-150/op | Skip overflow checks on proven-safe ops |
| Short-circuit evaluation | Variable | Order `&&`/`\|\|` by likelihood |
| Cache storage reads | 100+/read | Local variable for repeated SLOAD |
| Batch operations | Variable | Amortize base cost across items |
| Immutable/constant | 2,100/read | Zero SLOAD -- value in bytecode |

### Storage Packing

The EVM operates on 32-byte slots. Consecutive variables smaller than 32 bytes share a slot:

```solidity
// BAD -- 3 slots
uint256 amount;     // slot 0
uint128 timestamp;  // slot 1 (alone)
uint128 nonce;      // slot 2 (alone)

// GOOD -- 2 slots
uint256 amount;     // slot 0
uint128 timestamp;  // slot 1 (first 16 bytes)
uint128 nonce;      // slot 1 (next 16 bytes)
```

### Caching Storage Reads

Each `SLOAD` costs 2,100 gas (cold) or 100 gas (warm):

```solidity
// BAD -- 3 SLOADs
function process() external {
    require(balances[msg.sender] > 0);
    uint256 fee = balances[msg.sender] / 100;
    balances[msg.sender] -= fee;
}

// GOOD -- 1 SLOAD
function process() external {
    uint256 bal = balances[msg.sender];
    if (bal == 0) revert ZeroBalance();
    balances[msg.sender] = bal - (bal / 100);
}
```

### Unchecked Loop Counters

```solidity
function sum(uint256[] calldata values) external pure returns (uint256 total) {
    uint256 len = values.length;
    for (uint256 i; i < len;) {
        total += values[i];
        unchecked { ++i; }
    }
}
```

---

## Upgrade Patterns

### UUPS Proxy (EIP-1822)

Upgrade logic in the implementation. Lower gas per call. Preferred by OpenZeppelin:

```solidity
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MyTokenV1 is Initializable, ERC20Upgradeable, UUPSUpgradeable, OwnableUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(string memory name, string memory symbol) public initializer {
        __ERC20_init(name, symbol);
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
```

### Transparent Proxy

Upgrade logic in the proxy (admin-only). Higher per-call gas due to admin slot check. Use when upgrade authority must be fully separated from contract logic.

### Diamond Pattern (EIP-2535)

Modular upgrade via facets -- each facet provides functions selected by 4-byte selector. Justified only when bytecode exceeds 24KB or independently upgradeable modules are required:

```solidity
struct FacetCut {
    address facetAddress;
    FacetCutAction action;  // Add, Replace, Remove
    bytes4[] functionSelectors;
}
```

### Storage Collision Prevention

**Storage gaps** -- reserve slots in base contracts:

```solidity
contract BaseV1 is Initializable {
    uint256 public value;
    uint256[49] private __gap; // Reserve 49 slots for future variables
}
```

**EIP-7201 Namespaced Storage** -- hash-based locations eliminate collision risk:

```solidity
/// @custom:storage-location erc7201:myproject.storage.MyToken
struct MyTokenStorage {
    mapping(address => uint256) balances;
    uint256 totalMinted;
}

function _getMyTokenStorage() private pure returns (MyTokenStorage storage $) {
    bytes32 slot = STORAGE_LOCATION;
    assembly { $.slot := slot }
}
```

---

## Testing with Foundry

### Setup

```bash
forge init my-project && cd my-project
forge install OpenZeppelin/openzeppelin-contracts
# foundry.toml: solc = "0.8.28", optimizer = true, optimizer_runs = 200
```

### Unit Tests

```solidity
import {Test} from "forge-std/Test.sol";
import {MyToken} from "../src/MyToken.sol";

contract MyTokenTest is Test {
    MyToken token;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        token = new MyToken();
        token.transfer(alice, 1000e18);
    }

    function test_TransferUpdatesBalances() public {
        vm.prank(alice);
        token.transfer(bob, 100e18);
        assertEq(token.balanceOf(alice), 900e18);
        assertEq(token.balanceOf(bob), 100e18);
    }

    function test_RevertWhen_TransferExceedsBalance() public {
        vm.prank(alice);
        vm.expectRevert();
        token.transfer(bob, 2000e18);
    }
}
```

### Fuzz Tests

```solidity
function testFuzz_Transfer(address to, uint256 amount) public {
    vm.assume(to != address(0) && to != address(token));
    vm.assume(amount <= token.balanceOf(address(this)));

    uint256 preBal = token.balanceOf(to);
    token.transfer(to, amount);
    assertEq(token.balanceOf(to), preBal + amount);
}

function testFuzz_DepositWithdrawRoundTrip(uint256 assets) public {
    assets = bound(assets, 1, 1_000_000e18);
    deal(address(underlying), address(this), assets);
    underlying.approve(address(vault), assets);
    uint256 shares = vault.deposit(assets, address(this));
    uint256 withdrawn = vault.redeem(shares, address(this), address(this));
    assertApproxEqAbs(withdrawn, assets, 1);
}
```

### Invariant Tests

```solidity
contract TokenInvariantTest is Test {
    MyToken token;
    Handler handler;

    function setUp() public {
        token = new MyToken();
        handler = new Handler(token);
        targetContract(address(handler));
    }

    function invariant_totalSupplyNeverExceedsMax() public view {
        assertLe(token.totalSupply(), token.MAX_SUPPLY());
    }
}
```

### Fork Tests

```solidity
function test_SwapOnMainnetFork() public {
    vm.createSelectFork(vm.envString("MAINNET_RPC_URL"), 19_000_000);
    IUniswapV2Router02 router = IUniswapV2Router02(UNISWAP_V2_ROUTER);
    // Test against real liquidity pool state at block 19,000,000
}
```

### Hardhat Comparison

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyToken", function () {
    it("transfers tokens", async function () {
        const [owner, alice, bob] = await ethers.getSigners();
        const token = await (await ethers.getContractFactory("MyToken")).deploy();
        await token.transfer(alice.address, 1000n * 10n ** 18n);
        await token.connect(alice).transfer(bob.address, 100n * 10n ** 18n);
        expect(await token.balanceOf(bob.address)).to.equal(100n * 10n ** 18n);
    });
});
```

Foundry is preferred for Solidity-native testing (faster, fuzz/invariant built-in). Hardhat for TypeScript deployment scripts and plugin ecosystem.

---

## DeFi Primitives

### AMM (Constant Product)

Formula: `x * y = k`. Price impact increases with trade size relative to reserves:

```solidity
function getAmountOut(
    uint256 amountIn, uint256 reserveIn, uint256 reserveOut
) internal pure returns (uint256) {
    if (amountIn == 0) revert InsufficientInput();
    if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();
    uint256 amountInWithFee = amountIn * 997; // 0.3% fee
    return (amountInWithFee * reserveOut) / ((reserveIn * 1000) + amountInWithFee);
}

function swap(uint256 amountIn, uint256 amountOutMin, uint256 deadline) external {
    if (block.timestamp > deadline) revert DeadlineExpired();
    uint256 amountOut = getAmountOut(amountIn, reserveA, reserveB);
    if (amountOut < amountOutMin) revert SlippageExceeded();
}
```

### Lending (Health Factor / Liquidation)

```solidity
function healthFactor(address user) public view returns (uint256) {
    uint256 collateralETH = getUserCollateralETH(user);
    uint256 debtETH = getUserDebtETH(user);
    if (debtETH == 0) return type(uint256).max;
    return (collateralETH * liquidationThreshold) / (debtETH * PRECISION);
    // Health factor < 1.0 triggers liquidation
}
```

### Flash Loans

Borrow any amount with zero collateral -- must repay within the same transaction:

```solidity
contract FlashBorrower is IFlashLoanReceiver {
    function onFlashLoan(
        address, address token, uint256 amount, uint256 fee, bytes calldata
    ) external override returns (bytes32) {
        // Execute arbitrage, collateral swap, or self-liquidation
        IERC20(token).approve(msg.sender, amount + fee);
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }
}
```

### Yield Aggregation

Auto-compounding vaults harvest rewards and reinvest via ERC-4626:

```solidity
contract StrategyVault is ERC4626 {
    IFarm immutable i_farm;

    function harvest() external {
        uint256 rewards = i_farm.claimRewards();
        i_farm.deposit(swappedAmount); // Compound
        emit Harvested(rewards, swappedAmount);
    }

    function totalAssets() public view override returns (uint256) {
        return i_farm.balanceOf(address(this)) + asset.balanceOf(address(this));
    }
}
```

---

## Account Abstraction (ERC-4337)

```
User -> UserOperation -> Bundler -> EntryPoint -> Smart Wallet
                                       |
                                    Paymaster (gas sponsorship)
```

### Smart Wallet Pattern

```solidity
import "@account-abstraction/contracts/core/BaseAccount.sol";

contract SmartWallet is BaseAccount {
    address public owner;
    IEntryPoint private immutable i_entryPoint;

    function _validateSignature(
        PackedUserOperation calldata userOp, bytes32 userOpHash
    ) internal view override returns (uint256) {
        bytes32 hash = MessageHashUtils.toEthSignedMessageHash(userOpHash);
        if (owner != ECDSA.recover(hash, userOp.signature)) return SIG_VALIDATION_FAILED;
        return SIG_VALIDATION_SUCCESS;
    }

    function execute(address dest, uint256 value, bytes calldata data) external {
        _requireFromEntryPoint();
        (bool success,) = dest.call{value: value}(data);
        if (!success) revert ExecutionFailed();
    }
}
```

**Paymaster** contracts cover gas fees for users -- verify sponsor signatures or check user eligibility in `_validatePaymasterUserOp`, enabling gasless UX.

---

## Development Tooling

| Tool | Purpose | When to use |
|------|---------|-------------|
| **Foundry** (forge/cast/anvil) | Testing, deployment, local chain | Default for all Solidity projects |
| **Hardhat** | TypeScript scripts, plugin ecosystem | When TS tooling is required |
| **Slither** | Static analysis (Trail of Bits) | Every PR -- reentrancy, unused returns |
| **Mythril** | Symbolic execution | Pre-audit deep analysis |
| **Aderyn** | Rust-based static analysis (Cyfrin) | Fast CI checks |
| **OpenZeppelin Defender** | Monitoring, automation, upgrades | Production operations |
| **Tenderly** | Tx simulation, debugging, alerting | Debugging failed transactions |

### CI Pipeline

```bash
forge build --sizes                        # Contract sizes (<24KB)
forge test -vvv                            # All tests with trace
forge coverage                             # Coverage report
slither . --filter-paths "test|script|lib" # Static analysis
```

---

## Security Patterns

### Reentrancy Protection (CEI + nonReentrant)

```solidity
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Vault is ReentrancyGuard {
    mapping(address => uint256) public balances;

    function withdraw(uint256 amount) external nonReentrant {
        if (balances[msg.sender] < amount) revert InsufficientBalance(); // Check
        balances[msg.sender] -= amount;                                  // Effect
        (bool success,) = msg.sender.call{value: amount}("");            // Interaction
        if (!success) revert TransferFailed();
    }
}
```

### Access Control

```solidity
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Treasury is AccessControl {
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");

    constructor(address admin) { _grantRole(DEFAULT_ADMIN_ROLE, admin); }

    function withdraw(address to, uint256 amount) external onlyRole(TREASURER_ROLE) {}
}
```

### Safe External Calls

```solidity
// NEVER use transfer()/send() -- 2300 gas limit breaks with EIP-1884
(bool success,) = to.call{value: amount}("");
if (!success) revert TransferFailed();

// For ERC-20 -- SafeERC20 handles non-standard return values
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
using SafeERC20 for IERC20;
token.safeTransfer(to, amount);
```

---

## Anti-Patterns & Pitfalls

### 1. `tx.origin` for Authorization
`tx.origin` returns the EOA, not the immediate caller -- enables phishing via intermediary contracts. Always use `msg.sender`.

### 2. Unchecked External Call Return Values
Low-level `.call()` returns a boolean. Ignoring it silently swallows failures. Always check `success`.

### 3. Missing Reentrancy Guards
Any function making external calls after state changes is vulnerable. Apply `nonReentrant` + CEI ordering.

### 4. Floating Pragma
`^0.8.0` compiles with any 0.8.x. Different versions produce different bytecode. Pin exact version.

### 5. `transfer()`/`send()` for ETH
2,300 gas limit breaks with EIP-1884 when receiver reads storage. Use `.call{value: amount}("")`.

### 6. Hardcoded Addresses
Addresses differ across chains. Use constructor parameters or immutables for deployable contracts.

### 7. Missing Events for State Changes
Events are the only way off-chain systems detect mutations:
```solidity
event FeeUpdated(uint256 oldFee, uint256 newFee);
function setFee(uint256 newFee) external onlyOwner {
    emit FeeUpdated(fee, newFee);
    fee = newFee;
}
```

### 8. `block.timestamp` for Randomness
Validators influence timestamp within ~15s. Use Chainlink VRF for on-chain randomness.

### 9. Unbounded Loops
Iteration over unbounded arrays will exceed block gas limit. Use pull patterns:
```solidity
function claim() external {
    uint256 owed = rewards[msg.sender];
    if (owed == 0) revert NothingToClaim();
    rewards[msg.sender] = 0;
    token.safeTransfer(msg.sender, owed);
}
```

### 10. Missing Zero-Address Checks
Setting critical roles to `address(0)` bricks admin functions permanently.

### 11. Approval Race Condition (ERC-20)
Changing allowance from N to M lets spender front-run for N+M. Use `increaseAllowance`/`decreaseAllowance`.

### 12. Uninitialized Proxy Implementation
Attacker calls `initialize()` on unprotected implementation. Always `_disableInitializers()` in constructor.

### 13. Oracle Manipulation via Spot Price
`pool.getReserves()` is manipulable via flash loans. Use TWAP or Chainlink price feeds:
```solidity
(, int256 price,, uint256 updatedAt,) = priceFeed.latestRoundData();
if (price <= 0) revert InvalidPrice();
if (block.timestamp - updatedAt > STALENESS_THRESHOLD) revert StalePrice();
```

---

## Decision Trees

### Which Proxy Pattern?
```
Need modular upgrades with >24KB bytecode?
  YES --> Diamond (EIP-2535)
  NO  --> Need admin-implementation separation?
            YES --> Transparent Proxy
            NO  --> UUPS (default -- cheapest for users)
```

### Which Token Standard?
```
Every token is identical (currency, points)?
  YES --> ERC-20
  NO  --> Every token is unique (art, identity)?
            YES --> ERC-721
            NO  --> Mix of fungible + non-fungible?
                      YES --> ERC-1155
                      NO  --> ERC-721
```

### Which Testing Approach?
```
Solidity-native team, need fuzz/invariant tests?
  YES --> Foundry (default)
  NO  --> Heavy TypeScript deployment/integration?
            YES --> Hardhat
            NO  --> Both (Foundry for tests, Hardhat for scripts)
```

---

*Researched: 2026-03-12 | Sources: [Ethereum Foundation Solidity Docs 0.8.x](https://docs.soliditylang.org/en/v0.8.28/), [OpenZeppelin Contracts 5.x](https://docs.openzeppelin.com/contracts/5.x/), [Foundry Book](https://book.getfoundry.sh/), [EIP-20](https://eips.ethereum.org/EIPS/eip-20), [EIP-721](https://eips.ethereum.org/EIPS/eip-721), [EIP-1155](https://eips.ethereum.org/EIPS/eip-1155), [EIP-4626](https://eips.ethereum.org/EIPS/eip-4626), [EIP-4337](https://eips.ethereum.org/EIPS/eip-4337), [EIP-1822 UUPS](https://eips.ethereum.org/EIPS/eip-1822), [EIP-2535 Diamond](https://eips.ethereum.org/EIPS/eip-2535), [EIP-7201 Namespaced Storage](https://eips.ethereum.org/EIPS/eip-7201), [Trail of Bits Security Reviews](https://github.com/trailofbits/publications), [Consensys Smart Contract Best Practices](https://consensys.github.io/smart-contract-best-practices/), [Chainlink VRF](https://docs.chain.link/vrf), [Chainlink Price Feeds](https://docs.chain.link/data-feeds), [Rekt News](https://rekt.news/leaderboard/)*
