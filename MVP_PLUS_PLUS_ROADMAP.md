# 🚀 COINSCIOUS MVP++ Implementation Roadmap

## 📊 **SPRINT 1: Core Operator UX + Security Rails** (Weeks 1-2)

### 🎯 **Must-Haves (Critical Path)**

#### 1. **Operator Console Foundation**
- **Tech Stack**: Next.js 14 + wagmi/viem + Tailwind CSS
- **Architecture**: Single-page admin console with tabbed interface
- **Environment Safety**: Big "TEST MODE – Base Sepolia" banner
- **Preflight System**: Every action shows dry-run with human-readable results

#### 2. **Security Rails Implementation**
- **Multisig-in-a-box**: Two-operator co-signing for Danger Zone actions
- **API Hardening**: HMAC webhooks, idempotency keys, strict CORS, RBAC
- **On-chain Invariants**: Foundry invariant tests for critical state checks
- **Secrets Lifecycle**: 90-day rotation with one-click re-key

#### 3. **Basic Observability**
- **Event Indexer**: Node worker → Postgres (token_transfers, compliance_actions, payouts, snapshots)
- **Alerts**: Email/Slack for critical events (pause, freeze, forceTransfer, controller change)
- **Ops Dashboard**: Last payout, holders count, paused state, recent events

#### 4. **Preflight Simulation System**
- **Static Call Integration**: Every action shows dry-run results
- **Human-Readable Errors**: "This transfer will FAIL: ERR_FROZEN (Wallet is frozen)"
- **Gas Estimation**: "Network fee est: 0.014 ETH"
- **Reason Code Translator**: bytes32 → human sentences

### 🎯 **Should-Haves (Quick Wins)**

#### 1. **Reason Code Translator**
```json
{
  "0x1234...ERR_FROZEN": {
    "code": "ERR_FROZEN",
    "title": "Account Frozen",
    "explain": "This wallet is temporarily blocked by compliance."
  }
}
```

#### 2. **Basic Event Indexing**
- **Tables**: token_transfers, compliance_actions, payouts, snapshots
- **Real-time**: WebSocket updates for live dashboard
- **Export**: CSV download for all event types

#### 3. **CSV Upload for Claims**
- **Bulk Operations**: Upload claims, preview diffs, apply changes
- **Validation**: Format checking, duplicate detection
- **Preview**: "5 new claims, 2 modified, 0 removed"

---

## 📊 **SPRINT 2: Advanced Features + Production Readiness** (Weeks 3-4)

### 🎯 **Must-Haves (Critical Path)**

#### 1. **Multisig-in-a-box**
- **UI Co-signing**: Two operator wallets must approve Danger Zone actions
- **Backend Validation**: API checks both signatures before execution
- **Audit Trail**: Log all multi-sig actions with timestamps

#### 2. **Complete Observability**
- **Advanced Alerts**: Configurable thresholds, escalation paths
- **Performance Metrics**: Gas usage trends, transaction success rates
- **Health Checks**: Automated system health monitoring

#### 3. **PAYOUT_V2 Toggle**
- **Merkle Pull-Claims**: Spec & stub implementation
- **UI Preview**: Compute Merkle root, show distribution
- **Feature Flag**: Toggle between V1 and V2 without code changes

#### 4. **CI/CD Redline Gates**
- **Coverage ≥ 85%**: Fail PR if coverage drops
- **Slither Security**: Fail on medium/high severity
- **Gas Budget**: Fail if any function regresses > X%
- **Nightly Jobs**: Anvil deploy + smoke test + artifact upload

### 🎯 **Should-Haves (Quick Wins)**

#### 1. **Receipt UX**
- **Share Cards**: Post-payout individual holder receipts
- **Transaction Links**: Direct links to Base Sepolia explorer
- **Amount Breakdown**: Clear display of received amount

#### 2. **Nightly Anvil Jobs**
- **Ephemeral Deploy**: Fresh testnet deployment every night
- **Scripted Smoke Tests**: Automated end-to-end testing
- **Artifact Upload**: Gas reports, ABIs, coverage reports

#### 3. **Documentation**
- **Runbook**: 1-page operational procedures
- **Threat Model**: Top 5 risks and mitigations
- **API Docs**: OpenAPI spec with examples

---

## 🏗️ **TECHNICAL ARCHITECTURE**

### **Frontend (Operator Console)**
```
src/
├── components/
│   ├── Overview/
│   ├── Compliance/
│   ├── Token/
│   ├── Payouts/
│   ├── Events/
│   └── DangerZone/
├── hooks/
│   ├── usePreflight.ts
│   ├── useMultisig.ts
│   └── useReasonCodes.ts
├── lib/
│   ├── reasonCodes.json
│   ├── preflight.ts
│   └── multisig.ts
└── pages/
    └── admin/
        └── console.tsx
```

### **Backend (API + Indexer)**
```
backend/
├── api/
│   ├── routes/
│   │   ├── compliance.ts
│   │   ├── token.ts
│   │   ├── payouts.ts
│   │   └── multisig.ts
│   ├── middleware/
│   │   ├── hmac.ts
│   │   ├── idempotency.ts
│   │   └── rbac.ts
│   └── lib/
│       ├── contracts.ts
│       └── reasonCodes.ts
├── indexer/
│   ├── worker.ts
│   ├── events.ts
│   └── alerts.ts
└── database/
    ├── migrations/
    └── schema.sql
```

### **Infrastructure**
```
infrastructure/
├── docker/
│   ├── docker-compose.yml
│   ├── postgres/
│   └── redis/
├── ci/
│   ├── nightly-job.yml
│   ├── coverage-gate.yml
│   └── security-scan.yml
└── monitoring/
    ├── alerts.yml
    └── dashboards/
```

---

## 🎯 **ACCEPTANCE CRITERIA**

### **MVP ✔️ Checklist**

#### **Console & UX**
- [ ] Console shows green preflight on mint/transfer
- [ ] Red preflight with human-readable reason when blocked
- [ ] Environment banner clearly shows "TEST MODE – Base Sepolia"
- [ ] All tabs functional: Overview, Compliance, Token, Payouts, Events

#### **Security Rails**
- [ ] Every "Danger Zone" action requires two approvals in UI
- [ ] Multisig validation works even in TEST_MODE
- [ ] API hardening: HMAC, idempotency, CORS, RBAC all active
- [ ] On-chain invariants pass all Foundry tests

#### **Observability**
- [ ] Indexer populates all event tables
- [ ] Alerts fire on critical changes (pause, freeze, forceTransfer)
- [ ] Ops dashboard shows real-time data
- [ ] Event export to CSV works

#### **CI/CD & Quality**
- [ ] Nightly CI deploy + smoke test passes
- [ ] Coverage ≥ 85% enforced
- [ ] Slither fails on medium/high severity
- [ ] Gas budget diffs enforced
- [ ] Artifacts uploaded automatically

#### **Documentation**
- [ ] Runbook checked in and up-to-date
- [ ] Threat model documented
- [ ] Gas report updated
- [ ] API documentation complete

---

## 🚀 **NEXT IMMEDIATE ACTIONS**

1. **Set up Next.js project structure**
2. **Create reason codes JSON registry**
3. **Build preflight simulation system**
4. **Implement basic event indexer**
5. **Set up CI/CD pipeline with redline gates**

**Ready to start Sprint 1?** 🎯

