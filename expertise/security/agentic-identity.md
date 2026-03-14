# Agentic Identity & Trust -- Expertise Module

> Agent-to-agent identity is an unsolved problem in production systems. Traditional PKI assumes human-operated endpoints, but autonomous AI agents operate without human-in-the-loop approval for every action. This module covers cryptographic identity, trust scoring, delegation chains, and zero-trust principles for multi-agent architectures.

---

## Authority and Context

The 2024-2026 explosion of autonomous AI agents -- from Microsoft AutoGen and LangChain
multi-agent pipelines to custom orchestration frameworks -- has created a new class of
identity and authorization problems. NIST SP 800-207 (Zero Trust Architecture, 2020)
established that no network location grants implicit trust, but it was written for
human-operated systems. OWASP Top 10 for LLM Applications (2025) identifies insecure
agent delegation and insufficient output validation as critical risks, yet provides no
cryptographic identity framework for agents.

Agents are not users. They cannot type passwords or pass CAPTCHA challenges, and they
operate at machine speed across trust boundaries. A compromised agent exfiltrates data
orders of magnitude faster than a compromised human account. Microsoft AutoGen's security
model relies on process isolation but does not define inter-agent cryptographic identity.
LangChain's security guidelines focus on prompt injection defense but leave agent identity
to the deployer. Neither framework provides a standard for proving which agent performed
which action -- the foundational requirement for accountability in autonomous systems.

---

## Cryptographic Agent Identity

Every agent must have a provable, non-forgeable identity. Ed25519 provides the right
trade-offs: 64-byte signatures, fast verification, deterministic signing, and resistance
to timing side-channels.

### Keypair Lifecycle

```typescript
import { ed25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

// Generate agent identity
const privateKey = ed25519.utils.randomPrivateKey();
const publicKey = ed25519.getPublicKey(privateKey);
const agentId = bytesToHex(sha256(publicKey)).slice(0, 32);

// Sign an action
const message = new TextEncoder().encode(JSON.stringify({
  action: 'write_file',
  target: 'src/main.ts',
  timestamp: Date.now(),
}));
const signature = ed25519.sign(message, privateKey);

// Verify
const isValid = ed25519.verify(signature, message, publicKey);
```

### Credential Lifecycle

| Phase | What Happens | Failure Mode |
|-------|-------------|--------------|
| **Generation** | Agent creates Ed25519 keypair at first boot. Private key never leaves the runtime. | Weak entropy produces predictable keys. |
| **Registration** | Agent submits public key + metadata to the orchestrator. Orchestrator records agentId <-> role <-> capabilities. | Unverified registration allows impersonation. |
| **Rotation** | Agent generates new keypair, signs new public key with old private key, submits signed rotation request. | Delayed rotation extends compromise window. |
| **Revocation** | Orchestrator publishes revoked agentId to all peers. Revocation is irreversible. | Missing propagation allows continued use. |

### Key Storage Options

| Environment | Storage | Trade-off |
|-------------|---------|-----------|
| Development | Encrypted file on disk (`~/.superagent/keys/`) | Convenient, vulnerable to disk access |
| Staging | OS keychain (macOS Keychain, Linux keyring) | Process-isolated, accessible to root |
| Production | Hardware Security Module (HSM) or cloud KMS | Keys never leave hardware; signing latency |
| High-security | Trusted Execution Environment (TEE) | Attestation-backed; complex provisioning |

### Lightweight JSON Credential

X.509 certificates are overweight for agent identity. Agents need a minimal credential:

```typescript
interface AgentCredential {
  version: 1;
  agentId: string;          // SHA-256(publicKey).slice(0, 32)
  publicKey: string;        // Hex-encoded Ed25519 public key
  role: string;             // e.g., 'executor', 'verifier', 'reviewer'
  capabilities: string[];   // e.g., ['file:read', 'file:write', 'tool:execute']
  issuedAt: string;         // ISO 8601 timestamp
  expiresAt: string;        // ISO 8601 timestamp
  issuer: string;           // Orchestrator's agentId
  issuerSignature: string;  // Orchestrator signs the credential fields
}
```

The orchestrator signs credentials at issuance. Any peer verifies by checking the
issuer's signature against the orchestrator's known public key. Credential expiry forces
periodic re-registration, limiting the blast radius of a compromised key.

---

## Trust Scoring Model

Trust must be asymmetric: easy to lose, hard to regain. The model is penalty-based --
agents start at full trust and lose it through violations.

### Trust Event Table

| Event | Trust Impact | Rationale |
|-------|-------------|-----------|
| Baseline (new agent) | 1.0 | Default trust until proven otherwise |
| Successful verified task | +0.0 | Trust is the default, not a reward |
| Failed verification | -0.10 | Output did not match claims |
| Unauthorized action | -0.30 | Attempted scope violation |
| Credential expiry ignored | -0.20 | Hygiene failure |
| Peer verification passed | +0.05 | Cross-validated by another agent |
| Trust recovery (after penalty) | +0.02/task | Slow rebuild after violation |
| Tampered evidence record | -0.50 | Integrity violation -- most severe |

### Implementation

```typescript
interface TrustEvent {
  type: string;
  impact: number;
  timestamp: string;
  evidence: string;  // Reference to EvidenceRecord ID
}

interface TrustScore {
  agentId: string;
  score: number;       // 0.0 - 1.0
  history: TrustEvent[];
  status: 'active' | 'restricted' | 'suspended';
}

function updateTrust(current: TrustScore, event: TrustEvent): TrustScore {
  const newScore = Math.max(0, Math.min(1.0, current.score + event.impact));
  const status = newScore >= 0.5 ? 'active'
    : newScore >= 0.3 ? 'restricted'
    : 'suspended';
  return { ...current, score: newScore, status, history: [...current.history, event] };
}
```

| Status | Score Range | Allowed Actions |
|--------|-----------|-----------------|
| `active` | 0.50 - 1.00 | Full capabilities as defined in credential |
| `restricted` | 0.30 - 0.49 | Read-only; writes require co-signing by a trusted peer |
| `suspended` | 0.00 - 0.29 | No actions; must re-register with orchestrator approval |

**Why +0.0 for successful tasks:** Rewarding routine success inflates scores, making
penalties meaningless. Trust is a ceiling, not a currency to stockpile.

---

## Delegation Chains

Agents delegate authority to other agents. Each hop must narrow scope -- never widen it.

```typescript
interface Permission {
  resource: string;   // e.g., 'file:src/**', 'tool:git', 'api:github'
  actions: string[];  // e.g., ['read', 'write', 'execute']
}

interface Delegation {
  delegator: string;    // Agent ID granting permission
  delegate: string;     // Agent ID receiving permission
  scope: Permission[];  // What they can do
  constraints: {
    maxDepth: number;    // How many re-delegations allowed
    expiresAt: string;   // ISO timestamp
    conditions: string[];// Contextual restrictions
  };
  signature: string;    // Delegator's Ed25519 signature
}

// Scope MUST narrow at each hop (never widen)
// Depth MUST decrement (prevent infinite chains)
```

### Chain Verification Algorithm

```typescript
function verifyDelegationChain(
  chain: Delegation[],
  requestedAction: Permission,
  agentRegistry: Map<string, AgentCredential>,
): { valid: boolean; reason?: string } {
  if (chain.length === 0) return { valid: false, reason: 'Empty chain' };
  const now = new Date().toISOString();

  for (let i = 0; i < chain.length; i++) {
    const d = chain[i];
    const cred = agentRegistry.get(d.delegator);
    if (!cred) return { valid: false, reason: `Unknown delegator: ${d.delegator}` };

    // Verify signature over delegation payload
    const payload = new TextEncoder().encode(
      JSON.stringify({ delegate: d.delegate, scope: d.scope, constraints: d.constraints })
    );
    if (!ed25519.verify(hexToBytes(d.signature), payload, hexToBytes(cred.publicKey))) {
      return { valid: false, reason: `Invalid signature at hop ${i}` };
    }

    if (d.constraints.expiresAt < now)
      return { valid: false, reason: `Expired at hop ${i}` };
    if (i > 0 && chain[i - 1].constraints.maxDepth <= 0)
      return { valid: false, reason: `Depth exceeded at hop ${i}` };
    if (i > 0 && !isScopeSubset(d.scope, chain[i - 1].scope))
      return { valid: false, reason: `Scope widened at hop ${i}` };
  }

  const finalScope = chain[chain.length - 1].scope;
  if (!isScopeSubset([requestedAction], finalScope))
    return { valid: false, reason: 'Action not covered by delegation scope' };
  return { valid: true };
}

function isScopeSubset(child: Permission[], parent: Permission[]): boolean {
  return child.every(cp =>
    parent.some(pp => pp.resource === cp.resource
      && cp.actions.every(a => pp.actions.includes(a)))
  );
}
```

### Delegation Rules

1. **Scope narrows at every hop.** A delegate cannot grant permissions it does not hold.
2. **Depth decrements.** `maxDepth: 2` allows re-delegation with `maxDepth: 1`. At 0, no
   further re-delegation.
3. **Expiry propagates.** A child delegation cannot outlive its parent.
4. **Revocation cascades.** Revoking a delegator invalidates all downstream delegations.

---

## Evidence Records

Every action produces an append-only evidence record. Records form a hash chain -- each
references the previous record's hash, making tampering detectable.

```typescript
interface EvidenceRecord {
  id: string;           // UUID v4
  timestamp: string;    // ISO 8601
  agentId: string;      // Who performed the action
  action: string;       // What was done (e.g., 'file:write:src/main.ts')
  inputHash: string;    // SHA-256 of input
  outputHash: string;   // SHA-256 of output
  parentHash: string;   // Previous record hash (chain integrity)
  delegationRef: string;// Which delegation authorized this
  signature: string;    // Agent's Ed25519 signature over all fields above
}
```

### Chain Integrity Verification

```typescript
function verifyEvidenceChain(
  records: EvidenceRecord[],
  agentRegistry: Map<string, AgentCredential>,
): { valid: boolean; brokenAt?: number; reason?: string } {
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const cred = agentRegistry.get(r.agentId);
    if (!cred) return { valid: false, brokenAt: i, reason: 'Unknown agent' };

    // Verify signature over record payload (all fields except signature)
    const payload = new TextEncoder().encode(JSON.stringify({
      id: r.id, timestamp: r.timestamp, agentId: r.agentId, action: r.action,
      inputHash: r.inputHash, outputHash: r.outputHash,
      parentHash: r.parentHash, delegationRef: r.delegationRef,
    }));
    if (!ed25519.verify(hexToBytes(r.signature), payload, hexToBytes(cred.publicKey)))
      return { valid: false, brokenAt: i, reason: 'Invalid signature' };

    // Verify hash chain linkage
    if (i > 0) {
      const prevHash = bytesToHex(sha256(
        new TextEncoder().encode(JSON.stringify(records[i - 1]))
      ));
      if (r.parentHash !== prevHash)
        return { valid: false, brokenAt: i, reason: 'Broken hash chain' };
    }
  }
  return { valid: true };
}
```

### Evidence Rules

1. **Append-only.** Records are never modified or deleted.
2. **Signed at creation.** Late signing is a trust penalty (-0.10).
3. **Chain integrity.** Each `parentHash` must match the SHA-256 of the preceding record.
4. **Delegation binding.** Every record references its authorizing delegation.

---

## Zero-Trust Principles for Multi-Agent Systems

Six principles adapting NIST SP 800-207 for agent-to-agent communication.

### Principle 1: Never Trust Self-Reported Identity

Identity must be verified cryptographically via challenge-response:

```typescript
function verifyIdentity(
  claimedId: string,
  challenge: Uint8Array,
  response: Uint8Array,
  registry: Map<string, AgentCredential>,
): boolean {
  const cred = registry.get(claimedId);
  if (!cred || cred.expiresAt < new Date().toISOString()) return false;
  return ed25519.verify(response, challenge, hexToBytes(cred.publicKey));
}
```

### Principle 2: Verify Every Action Against Delegation Scope

"This agent has been trusted in the past" is not authorization for the current action.
Every action is checked against the active delegation chain.

### Principle 3: Fail Closed

Signature mismatch, expired credential, or scope violation means **deny**. No grace
periods, no fallback to permissive mode.

### Principle 4: Assume Compromise of Any Single Agent

Design every protocol assuming exactly one agent is compromised at any time. This drives
delegation scope limits, evidence integrity, and revocation propagation.

### Principle 5: Log Everything, Verify Independently

Verification of evidence records is performed by an independent agent, not the agent
that produced the output. Self-verification is not verification.

### Principle 6: No Implicit Trust from Proximity

Same machine, same process, same container -- none of these imply trust. Each agent
presents credentials regardless of deployment topology.

---

## Cross-Framework Federation

Agents from different frameworks must establish trust without a shared identity provider.

### Framework Identity Mechanisms (Current State)

| Framework | Identity Mechanism | Delegation Model | Evidence/Audit |
|-----------|--------------------|-------------------|----------------|
| Microsoft AutoGen | Process isolation, no crypto identity | Implicit orchestrator control | Conversation logging |
| LangChain/LangGraph | None built-in | Tool-level allow/deny lists | LangSmith tracing (optional) |
| CrewAI | Role-based string names | Hierarchical, no scope narrowing | Task output logging |
| OpenAI Assistants API | API key scoping per assistant | Function calling permissions | Run step logging |
| Custom orchestrators | Varies -- most lack crypto identity | Varies | Varies |

### Federation Protocol

```typescript
// Step 1: Credential exchange
interface FederationHandshake {
  sourceFramework: string;
  credential: AgentCredential;
  supportedProtocols: string[];  // e.g., ['ed25519-challenge-v1']
}

// Step 2: Challenge-response
interface FederationChallenge {
  nonce: string;              // Random 32-byte hex
  timestamp: string;
  requesterAgentId: string;
}

interface FederationResponse {
  nonce: string;
  responderAgentId: string;
  signature: string;          // Sign(nonce + timestamp + requesterAgentId)
}

// Step 3: Capability advertisement
interface CapabilityAdvertisement {
  agentId: string;
  capabilities: Permission[];
  trustScore: number;
  signature: string;
}
```

### Trust Bridging

1. **Mutual credential exchange** between framework orchestrators.
2. **Cross-signing** -- both orchestrators co-sign a federation agreement.
3. **Scoped delegation** -- cross-framework delegations are always more restrictive.
4. **Independent evidence** -- each framework maintains its own chain.

---

## Post-Quantum Readiness

Ed25519 is vulnerable to Shor's algorithm. NIST selected CRYSTALS-Dilithium (ML-DSA)
as the post-quantum signature standard in 2024.

| Phase | Timeline | Action |
|-------|---------|--------|
| **Prepare** | Now - 2027 | Add `version` field to AgentCredential. Dispatch verification by version. |
| **Hybrid** | 2027 - 2029 | Dual signatures: Ed25519 + ML-DSA. Protects against "harvest now, decrypt later." |
| **Mandatory** | 2030+ | Deprecate Ed25519-only. All credentials use ML-DSA. |

```typescript
interface HybridCredential extends AgentCredential {
  version: 2;
  classicalPublicKey: string;  // Ed25519
  pqPublicKey: string;         // ML-DSA-65 (Dilithium3)
  classicalSignature: string;
  pqSignature: string;
}

function verifyHybrid(cred: HybridCredential, payload: Uint8Array): boolean {
  const classical = ed25519.verify(
    hexToBytes(cred.classicalSignature), payload, hexToBytes(cred.classicalPublicKey));
  const pq = mlDsa65.verify(
    hexToBytes(cred.pqSignature), payload, hexToBytes(cred.pqPublicKey));
  return classical && pq;  // BOTH must be valid
}
```

**Size trade-off:** ML-DSA-65 signatures are 3,293 bytes (vs. 64 for Ed25519). For
agent-to-agent messages already measured in kilobytes, this is acceptable.

---

## Anti-Patterns

### AP-01: Shared Secrets Between Agents

All agents share the same API key. Compromise of one agent exposes the shared secret,
granting impersonation of every agent. **Fix:** Per-agent Ed25519 keypairs.

### AP-02: Trust-by-Proximity

Agents on the same machine skip verification. A supply chain attack or prompt injection
achieving code execution inherits trust of co-located agents. **Fix:** Verify credentials
regardless of deployment topology.

### AP-03: Self-Attestation

An agent signs its own credential. The signature is valid but meaningless -- no authority
vouches for the identity-to-capability binding. **Fix:** Orchestrator issues and signs
all credentials.

### AP-04: Permanent Delegation

Delegation tokens without expiry. Decommissioned agents retain authorization indefinitely.
**Fix:** Mandatory `expiresAt` on all delegations; maximum lifetime bounded by policy.

### AP-05: Trust Score Inflation

Rewarding routine tasks lets agents "farm" trust to absorb future violations. **Fix:**
Successful tasks award +0.0; trust is a ceiling, not a currency.

### AP-06: Bearer Tokens Without Binding

Tokens passed between agents with no cryptographic binding. A stolen token enables full
impersonation. **Fix:** Bind tokens to the delegate's public key; token is valid only
with a matching signature.

### AP-07: Symmetric Keys for Agent Identity

HMAC-based authentication cannot prove origin. If A and B share a key, B can forge
messages as A. No non-repudiation. **Fix:** Asymmetric signatures (Ed25519).

### AP-08: Logging Without Integrity Verification

Unsigned, unchained logs. A compromised agent modifies history to cover its tracks.
**Fix:** EvidenceRecord pattern with hash chains and per-record signatures.

### AP-09: Implicit Scope Inheritance

Delegates automatically inherit the delegator's full permission set. A verifier inherits
write access it should never have. **Fix:** Explicit `scope` on every delegation; chain
verification rejects scope widening.

---

## Self-Check Questions

### Identity
- [ ] Does every agent have a unique cryptographic keypair?
- [ ] Are credentials issued by a trusted authority (not self-signed)?
- [ ] Is there a credential expiry and rotation mechanism?
- [ ] Can a compromised agent's credential be revoked without affecting others?

### Trust
- [ ] Does the trust model penalize violations asymmetrically?
- [ ] Is routine success neutral (not rewarded)?
- [ ] Are restricted agents prevented from destructive actions?

### Delegation
- [ ] Does every delegation have explicit scope and expiry?
- [ ] Is scope narrowing enforced at every hop?
- [ ] Is re-delegation depth bounded?
- [ ] Does revoking a delegator cascade to downstream delegations?

### Evidence
- [ ] Is every action recorded in a signed, append-only chain?
- [ ] Are records hash-linked to the previous record?
- [ ] Is verification performed by an independent agent?

### Federation
- [ ] Is cross-framework identity verified via challenge-response?
- [ ] Are cross-framework delegations more restrictive than intra-framework?

---

## Cross-References

- **secrets-antipatterns** -- Agent private keys are secrets. Store and rotate accordingly.
- **security-theater** -- Self-attestation and trust-by-proximity are security theater.
- **distributed-systems-fundamentals** -- Agent communication faces the same network
  unreliability and ordering challenges as any distributed system.
- **consensus-and-coordination** -- Multi-orchestrator deployments require consensus on
  which credentials are valid.

---

## Sources

- [NIST SP 800-207: Zero Trust Architecture (2020)](https://csrc.nist.gov/publications/detail/sp/800-207/final)
- [OWASP Top 10 for LLM Applications (2025)](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [Ed25519: High-speed high-security signatures (Bernstein et al., 2012)](https://ed25519.cr.yp.to/)
- [CRYSTALS-Dilithium / ML-DSA -- NIST PQC Standard (2024)](https://csrc.nist.gov/pubs/fips/204/final)
- [Microsoft AutoGen: Multi-Agent Conversation Framework](https://arxiv.org/abs/2308.08155)
- [LangChain Security Best Practices](https://python.langchain.com/docs/security/)
- [SPIFFE: Secure Production Identity Framework for Everyone](https://spiffe.io/)
- [Macaroons: Cookies with Contextual Caveats (Google Research)](https://research.google/pubs/macaroons-cookies-with-contextual-caveats-for-decentralized-authorization-in-the-cloud/)
- [The @noble/curves Library](https://github.com/paulmillr/noble-curves)
- [Migration to Post-Quantum Cryptography -- CISA](https://www.cisa.gov/quantum)
