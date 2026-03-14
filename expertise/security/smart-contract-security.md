# Smart Contract Security — Expertise Module

> Expertise module for AI agents building or auditing smart contracts on EVM-compatible
> blockchains. Covers reentrancy, flash loans, oracle manipulation, access control, MEV,
> integer safety, formal verification, and audit methodology — the vulnerability classes
> responsible for billions in on-chain losses.

---

## 1. Threat Landscape

Chainalysis reported $3.8 billion stolen in crypto hacks in 2022 alone. Smart contracts
are immutable, permissionless, and custody real value — a single exploitable line drains
entire protocols with no rollback.

### Landmark Exploits

| Year | Protocol | Loss | Root Cause |
|------|----------|------|------------|
| 2016 | The DAO | $60M | Reentrancy in split function |
| 2017 | Parity Wallet | $300M frozen | Library self-destruct via unprotected init |
| 2021 | Poly Network | $611M | Unprotected cross-chain message handler |
| 2022 | Wormhole | $320M | Missing signature verification on guardian set |
| 2022 | Ronin Bridge | $624M | Compromised validator keys (5 of 9) |
| 2023 | Euler Finance | $197M | Unchecked donate-to-self in flash loan flow |
| 2023 | Curve Finance | $70M | Vyper compiler reentrancy lock bug |

**References:** SWC Registry, Trail of Bits, OpenZeppelin, Consensys Diligence.

---

## 2. Reentrancy Attacks

Reentrancy occurs when an external call lets the callee re-enter the caller before state
updates complete. Defense: **Checks-Effects-Interactions (CEI)** + `ReentrancyGuard`.

### 2.1 Single-Function Reentrancy

```solidity
// VULNERABLE: state update after external call
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount);
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);
    balances[msg.sender] -= amount;  // State update AFTER external call
}

// FIXED: Checks-Effects-Interactions + ReentrancyGuard
function withdraw(uint256 amount) external nonReentrant {
    require(balances[msg.sender] >= amount);
    balances[msg.sender] -= amount;  // Effect BEFORE interaction
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);
}
```

Attacker contract exploits the vulnerable version by re-entering `withdraw()` from its
`receive()` callback before the balance is decremented.

### 2.2 Cross-Function Reentrancy

Two functions share state. Attacker re-enters through a different function that reads
stale state.

```solidity
// VULNERABLE: transfer reads stale balance during withdraw callback
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount);
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);
    balances[msg.sender] -= amount;
}
function transfer(address to, uint256 amount) external {
    require(balances[msg.sender] >= amount);  // Still inflated mid-callback
    balances[msg.sender] -= amount;
    balances[to] += amount;
}

// FIXED: shared nonReentrant on both functions + CEI in withdraw
function withdraw(uint256 amount) external nonReentrant {
    require(balances[msg.sender] >= amount);
    balances[msg.sender] -= amount;
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);
}
function transfer(address to, uint256 amount) external nonReentrant {
    require(balances[msg.sender] >= amount);
    balances[msg.sender] -= amount;
    balances[to] += amount;
}
```

### 2.3 Cross-Contract Reentrancy

Contract A depends on state in Contract B. Callback during B's external call re-enters A,
which reads B's stale state.

```solidity
// VULNERABLE: ERC-777 token triggers callback before vault state updates
contract VulnerableTokenVault {
    IERC20 public token;
    mapping(address => uint256) public shares;

    function withdraw() external {
        uint256 userShares = shares[msg.sender];
        uint256 tokenAmount = calculateTokens(userShares);
        shares[msg.sender] = 0;
        token.transfer(msg.sender, tokenAmount);  // ERC-777 callback re-enters
    }
}

// FIXED: nonReentrant + SafeERC20
contract SecureTokenVault is ReentrancyGuard {
    function withdraw() external nonReentrant {
        uint256 userShares = shares[msg.sender];
        require(userShares > 0, "No shares");
        shares[msg.sender] = 0;
        SafeERC20.safeTransfer(token, msg.sender, calculateTokens(userShares));
    }
}
```

### 2.4 Read-Only Reentrancy

A `view` function returns stale state during a callback. A third contract reads the
inconsistent view and makes decisions on it. This bypasses reentrancy guards because the
re-entered function is read-only.

```solidity
// VULNERABLE: getPricePerShare() returns stale ratio mid-withdraw
function withdraw(uint256 shares) external {
    uint256 assets = shares * totalAssets / totalShares;
    totalShares -= shares;
    (bool s, ) = msg.sender.call{value: assets}("");  // Callback here
    require(s);
    totalAssets -= assets;  // Stale during callback — getPricePerShare() lies
}

// FIXED: update ALL state before external call
function withdraw(uint256 shares) external nonReentrant {
    uint256 assets = shares * totalAssets / totalShares;
    totalShares -= shares;
    totalAssets -= assets;  // Both updated before interaction
    (bool s, ) = msg.sender.call{value: assets}("");
    require(s);
}
```

---

## 3. Flash Loan Attacks

Flash loans provide unlimited zero-collateral capital within a single transaction, repaid
atomically or the entire transaction reverts.

### Attack Mechanism

1. Borrow massive capital via flash loan (e.g., 100M USDC)
2. Swap into target token on a DEX, moving the spot price dramatically
3. Use the distorted price as input to a vulnerable protocol's oracle
4. Execute the exploit (borrow at manipulated price, liquidate positions)
5. Reverse the swap, repay the flash loan, keep the profit

```solidity
// VULNERABLE: spot price from AMM reserves
function getPrice() public view returns (uint256) {
    (uint112 r0, uint112 r1, ) = pair.getReserves();
    return uint256(r0) * 1e18 / uint256(r1);  // Manipulable via flash loan
}

// FIXED: TWAP oracle (time-weighted average price)
function getTWAP() public view returns (uint256 price) {
    (int24 arithmeticMeanTick, ) = OracleLibrary.consult(pool, TWAP_PERIOD);
    price = OracleLibrary.getQuoteAtTick(arithmeticMeanTick, 1e18, token0, token1);
}
```

**Defense checklist:**
- Never use single-block spot prices for financial decisions
- TWAP with minimum 15-30 minute window
- Chainlink feeds as primary or fallback oracle
- Borrow/repay delays (minimum 1 block separation)
- Circuit breakers: halt if price moves >N% in one block

---

## 4. Oracle Manipulation

| Property | Spot Price | TWAP |
|----------|-----------|------|
| Manipulation cost | One transaction | Sustained over window |
| Latency | Real-time | Delayed by window |
| Use case | UI display only | Financial decisions |

**Rule: never use spot prices for on-chain financial calculations.**

### Chainlink Best Practices

```solidity
function getPrice() public view returns (uint256) {
    (uint80 roundId, int256 price, , uint256 updatedAt, uint80 answeredInRound)
        = priceFeed.latestRoundData();
    require(price > 0, "Oracle: invalid price");                   // Positive
    require(answeredInRound >= roundId, "Oracle: stale round");    // Complete
    require(block.timestamp - updatedAt <= STALENESS, "Oracle: stale price"); // Fresh
    return uint256(price);
}
```

### L2 Sequencer Uptime Check

On Arbitrum/Optimism, always verify the sequencer is live and a grace period has passed
since it recovered — stale prices may appear fresh after an outage.

```solidity
function _checkSequencer() internal view {
    (, int256 answer, uint256 startedAt, , ) = sequencerFeed.latestRoundData();
    require(answer == 0, "Sequencer down");
    require(block.timestamp - startedAt > GRACE_PERIOD, "Grace period");
}
```

### Fallback Oracle Pattern

Use dual oracles (Chainlink + TWAP). Cross-validate and fall back gracefully.

```solidity
contract DualOracle {
    AggregatorV3Interface public primaryOracle;   // Chainlink
    address public twapOracle;                     // Uniswap V3 TWAP
    uint256 public constant MAX_DEVIATION = 500;   // 5%

    function getPrice() public view returns (uint256) {
        (bool primaryOk, uint256 primaryPrice) = _tryPrimary();
        (bool twapOk, uint256 twapPrice) = _tryTWAP();

        if (primaryOk && twapOk) {
            uint256 deviation = _percentDiff(primaryPrice, twapPrice);
            require(deviation <= MAX_DEVIATION, "Oracle: price deviation");
            return primaryPrice;
        }
        if (primaryOk) return primaryPrice;
        if (twapOk) return twapPrice;
        revert("Oracle: no valid price source");
    }
}
```

---

## 5. Access Control

Any unprotected function is callable by anyone, forever. The Parity Wallet ($300M frozen)
and Poly Network ($611M) were both access control failures.

```solidity
// VULNERABLE: anyone can mint
function mint(address to, uint256 amount) external {
    balances[to] += amount;
}

// FIXED: role-based access control
import "@openzeppelin/contracts/access/AccessControl.sol";
contract SecureToken is AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        balances[to] += amount;
    }
}
```

### Centralization Mitigations

- **Multi-sig** (Gnosis Safe) for admin ops — M-of-N signatures required
- **Timelocks** (TimelockController) — 24-48 hour delay on admin actions
- **Role separation** — separate minter, pauser, upgrader, admin roles
- **Two-step transfer** (Ownable2Step) — prevents accidental ownership loss
- **Role renunciation** — renounce admin once governance is established

### Timelock for Governance

```solidity
TimelockController timelock = new TimelockController(
    48 hours, proposers, executors, address(0)  // Self-governed
);
```

---

## 6. Front-Running and MEV

MEV (Maximal Extractable Value) — profit a block producer extracts by reordering,
inserting, or censoring transactions within a block.

### Mempool Sniping

All pending transactions are visible in the public mempool before block inclusion. An
attacker monitors the mempool, detects a profitable transaction, and submits their own
with a higher gas price to execute first. Targets: DEX swaps, NFT mints, governance
votes, token listings.

### Sandwich Attacks

1. Attacker sees a large pending swap (e.g., buy 1M USDC of TOKEN)
2. Front-runs: buys TOKEN, pushing the price up
3. Victim's swap executes at the inflated price
4. Back-runs: sells TOKEN at the higher price
5. Victim receives fewer tokens; attacker profits from the spread

### Commit-Reveal Defense

```solidity
function commit(bytes32 hash) external {
    commitments[msg.sender] = Commitment(hash, block.number);
}
function reveal(uint256 amount, bytes32 secret) external {
    Commitment memory c = commitments[msg.sender];
    require(block.number >= c.block + REVEAL_DELAY, "Too early");
    require(c.hash == keccak256(abi.encodePacked(msg.sender, amount, secret)));
    delete commitments[msg.sender];
    _executeAction(msg.sender, amount);
}
```

### MEV Protection Strategies

| Strategy | Mechanism | Trade-off |
|----------|-----------|-----------|
| Flashbots Protect | Private mempool | Requires RPC change |
| MEV Blocker | Backrun auction | Adds latency |
| Slippage limits | Max acceptable price impact | Too tight = reverts |
| Batch auctions | Uniform clearing price | Higher latency |
| Encrypted mempools | Threshold encryption until inclusion | Experimental |

### Slippage Protection

```solidity
// VULNERABLE: amountOutMin = 0 accepts ANY output
router.swapExactTokensForTokens(amountIn, 0, path, msg.sender, block.timestamp);

// FIXED: enforce minimum output + deadline
uint256 minOut = getExpectedOutput(amountIn) * 995 / 1000;  // 0.5% tolerance
router.swapExactTokensForTokens(amountIn, minOut, path, msg.sender, block.timestamp + 300);
```

---

## 7. Integer Overflow/Underflow

### Pre-0.8: Silent Wrapping

```solidity
// VULNERABLE (Solidity < 0.8): 0 - 1 underflows to 2^256 - 1
pragma solidity ^0.7.6;
function transfer(address to, uint256 amount) external {
    require(balances[msg.sender] - amount >= 0);  // Always true — underflow wraps
    balances[msg.sender] -= amount;
    balances[to] += amount;
}

// FIXED: SafeMath
using SafeMath for uint256;
balances[msg.sender] = balances[msg.sender].sub(amount);  // Reverts on underflow
```

### 0.8+ Built-in Checks

Solidity 0.8 reverts automatically on overflow/underflow. The `unchecked` block disables
this for gas optimization — safe only when overflow is mathematically impossible.

```solidity
// SAFE: loop counter
for (uint256 i = 0; i < array.length;) {
    unchecked { ++i; }  // i bounded by array.length
}

// DANGEROUS: user-controlled values
unchecked { balances[msg.sender] -= amount; }  // Can underflow
```

**Rule:** never place user-controlled arithmetic inside `unchecked` blocks.

---

## 8. Formal Verification Tools

| Tool | Approach | Best For | Speed |
|------|----------|----------|-------|
| Slither | Static analysis | Quick vulnerability scan | Seconds |
| Mythril | Symbolic execution | Deep path analysis | Minutes |
| Echidna | Property-based fuzzing | Invariant testing | Minutes-hours |
| Certora | Formal verification | Mathematical proofs | Hours |
| Halmos | Symbolic testing | Foundry-compatible | Minutes |

### Slither

```bash
slither . --detect reentrancy-eth,reentrancy-no-eth,suicidal,uninitialized-state
```

Key detectors: `reentrancy-eth`, `suicidal`, `arbitrary-send-eth`,
`controlled-delegatecall`, `uninitialized-state`.

### Echidna Property Tests

Echidna generates random transaction sequences trying to violate invariant properties.
Functions prefixed `echidna_` must return `true` — if Echidna finds a sequence that
returns `false`, the invariant is broken.

```solidity
contract VaultTest is Vault {
    function echidna_balance_invariant() public view returns (bool) {
        return address(this).balance >= totalDeposits;
    }
    function echidna_supply_conservation() public view returns (bool) {
        return totalMinted == totalBurned + totalSupply();
    }
}
```

```yaml
# echidna.yaml
testMode: assertion
testLimit: 100000
seqLen: 100
deployer: "0x10000"
sender: ["0x20000", "0x30000"]
```

### Foundry Fuzz Testing

```solidity
function testFuzz_withdrawNeverExceedsBalance(uint256 dep, uint256 wd) public {
    dep = bound(dep, 1, 100 ether);
    wd = bound(wd, 0, dep);
    vault.deposit{value: dep}();
    vault.withdraw(wd);
    assertGe(address(vault).balance, dep - wd);
}
```

---

## 9. Audit Checklist

### Critical — Immediate Exploitation Risk

| # | Check | SWC |
|---|-------|-----|
| C1 | Reentrancy — state modified after external call | SWC-107 |
| C2 | Access control — admin functions callable by anyone | SWC-105 |
| C3 | Unchecked external call return value | SWC-104 |
| C4 | Delegatecall to user-controlled address | SWC-112 |
| C5 | Unprotected selfdestruct in proxy | SWC-106 |
| C6 | Signature replay — missing nonce or chain ID | — |
| C7 | Flash loan oracle manipulation | — |
| C8 | Uninitialized proxy implementation | — |

### High — Significant Financial Risk

| # | Check | SWC |
|---|-------|-----|
| H1 | Single-source spot price oracle | — |
| H2 | Flash loan attack vectors | — |
| H3 | Front-running sensitive operations | SWC-114 |
| H4 | Storage collision in proxy patterns | SWC-124 |
| H5 | Token approval race condition | — |
| H6 | Precision loss — division before multiplication | — |
| H7 | Missing slippage protection on swaps | — |

### Medium — Conditional Exploitation

| # | Check | SWC |
|---|-------|-----|
| M1 | Gas griefing — unbounded loops | SWC-128 |
| M2 | DoS via revert in push pattern | SWC-113 |
| M3 | Centralization risk — single admin key | — |
| M4 | Missing events for state changes | — |
| M5 | Block timestamp dependence | SWC-116 |
| M6 | ERC-20 return value not checked | — |

### Low — Best Practice Violations

| # | Check | SWC |
|---|-------|-----|
| L1 | Floating pragma | SWC-103 |
| L2 | Missing NatSpec documentation | — |
| L3 | Unused variables or imports | — |
| L4 | Missing zero-address checks | — |
| L5 | Magic numbers without named constants | — |

---

## 10. Anti-Patterns

### 10.1 tx.origin for Authentication

`tx.origin` returns the original EOA, not the immediate caller. A phishing contract
forwards calls with the victim's `tx.origin`.

```solidity
// VULNERABLE                          // FIXED
require(tx.origin == owner);           require(msg.sender == owner);
```

### 10.2 Block Timestamp for Randomness

Validators manipulate `block.timestamp` within ~15 seconds. Use Chainlink VRF instead.

```solidity
// VULNERABLE: predictable
uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender)));
// FIXED: Chainlink VRF — request/callback pattern with cryptographic proof
```

### 10.3 Missing Slippage Protection

Setting `amountOutMin = 0` makes every swap a sandwich target. Always calculate minimum
acceptable output from an oracle price and enforce a transaction deadline.

### 10.4 msg.value Reuse in Loops

`msg.value` is constant across loop iterations. An attacker deposits once but claims
credit per iteration.

```solidity
// VULNERABLE: msg.value checked per iteration
for (uint256 i = 0; i < amounts.length; i++) {
    require(msg.value >= amounts[i]);  // Same msg.value every time
    deposits[msg.sender] += amounts[i];
}
// FIXED: sum total required, check once
uint256 total = 0;
for (uint256 i = 0; i < amounts.length; i++) {
    total += amounts[i];
    deposits[msg.sender] += amounts[i];
}
require(msg.value >= total, "Insufficient ETH");
```

### 10.5 Trusting External Return Values

Malicious tokens can return `true` without transferring. Always verify balance changes.

```solidity
// VULNERABLE: trusting return value
bool success = IERC20(token).transfer(recipient, amount);
if (success) credits[msg.sender] += amount;  // Credit without real transfer

// FIXED: verify actual balance change
uint256 before = IERC20(token).balanceOf(address(this));
SafeERC20.safeTransferFrom(IERC20(token), msg.sender, address(this), amount);
uint256 received = IERC20(token).balanceOf(address(this)) - before;
credits[msg.sender] += received;  // Credit actual amount received
```

### 10.6 Unprotected Initialize Functions

Proxy implementations must use OpenZeppelin's `initializer` modifier. An unprotected
`initialize()` lets anyone take ownership of the implementation contract.

```solidity
// VULNERABLE                               // FIXED
function initialize(address o) external {   function initialize(address o) external initializer {
    owner = o;                                  __Ownable_init(o);
}                                           }
```

---

## 11. Development Workflow

### Pre-Deployment Checklist

1. **Static analysis** — Slither with all critical detectors on every commit
2. **Fuzz testing** — Echidna or Foundry fuzz, 100k+ runs minimum
3. **Unit tests** — 100% branch coverage on state-changing functions
4. **Formal verification** — Certora for contracts with >$10M TVL
5. **Peer review** — minimum two Solidity-experienced reviewers
6. **External audit** — mandatory for any contract handling user funds
7. **Bug bounty** — Immunefi program before mainnet launch
8. **Testnet deployment** — full integration testing on Sepolia
9. **Timelock admin** — all admin functions behind timelock
10. **Monitoring** — Forta or OpenZeppelin Defender for anomaly detection

### Gas Optimization Safety

Never sacrifice security for gas savings:
- Removing `nonReentrant` (~2600 gas) reintroduces reentrancy
- `unchecked` on user-controlled arithmetic reintroduces overflow
- Removing zero-address checks (~200 gas) enables permanent burns
- Inline assembly bypasses Solidity safety checks

**Rule:** optimize after the contract is correct and audited. Use `forge test --gas-report`.
