# Pilot Readiness Report — Coinscious
Commit: <hash>

| Item | Status | Evidence |
|---|---|---|
| Compliance reasons emitted & reverted | GREEN/AMBER/RED | tests/SecurityToken.t.sol:Lxx, audit/edge-tests.log:Lyy |
| Partition supply invariant (fuzz) |  |  |
| Underfunded branch invariant |  |  |
| Payout scalability (250+) |  |  |
| ForceTransfer gated by timelock |  |  |
| Factories wiring + CloneDeployed |  |  |
| Gas report realistic |  | audit/gas-report-contracts.txt |
| KYC webhook HMAC + idempotency |  | audit/webhook-samples/* |
| Transfer state machine gate |  | api e2e log path |
| Admin log append-only + root |  | SQL trigger test + LogAnchor txhash |
| PDFs + Audit ZIP + checksums |  | audit/audit-zip-sample/* |
| Edge tests (7 cases) |  | audit/edge-tests.log |
| Runbooks + Sepolia addresses |  | audit/runbooks/*, audit/addresses.sepolia.json |

## Critical Path to Pilot Readiness

### Non-Negotiables (Must Fix)
1. **Underfunded branch correctness** - PayoutDistributor math must be real
2. **Payout scalability** - Implement batched push with 250+ holder support
3. **Gas report generation** - Real numbers, not optimistic estimates
4. **Event assertions** - ComplianceCheck on every mint/transfer attempt
5. **ForceTransfer safety** - Only TimelockController, destination compliance

### Edge Cases to Cover
- Lockup boundary (T-1s/T+1s)
- Reg-S to US person restrictions
- Claims expiry between snapshot/distribute
- Post-snapshot revocation
- USDC allowance drop mid-batch
- Timelock early/late execute

### Audit Pack Requirements
- **Cap table hashing**: `keccak256(abi.encodePacked(csvBytesCanonicalSortedByWallet))`
- **Rounding**: 18-decimals → 2-decimals with banker's rounding
- **Residual**: `paid + residual = funded (±$0.01)`
- **Events**: Must emit before revert on compliance failures
- **ForceTransfer**: TimelockController only, destination compliance required

## Next Actions
1. Fix Foundry environment to run tests
2. Generate gas reports for 50/100/250 holders
3. Execute edge case test matrix
4. Complete audit pack artifacts
5. Deploy to Sepolia and populate addresses
6. Generate readiness report with evidence links
