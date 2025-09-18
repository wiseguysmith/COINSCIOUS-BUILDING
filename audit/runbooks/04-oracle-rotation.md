# Oracle Rotation Runbook

## Overview
This runbook covers the process for rotating compliance oracle signers, which is critical for maintaining security and operational continuity.

## Prerequisites
- Access to TimelockController
- New oracle private key generated
- New oracle address whitelisted
- Emergency contact list updated

## Rotation Process

### 1. Pre-Rotation Checklist
- [ ] New oracle key pair generated securely
- [ ] New oracle address added to whitelist
- [ ] New oracle tested with testnet compliance checks
- [ ] Team notified of rotation window
- [ ] Emergency contacts updated

### 2. Execute Rotation
```bash
# 1. Update oracle in ComplianceRegistry
cast send $COMPLIANCE_REGISTRY \
  "setComplianceOracle(address)" \
  $NEW_ORACLE_ADDRESS \
  --from $TIMELOCK_ADDRESS

# 2. Verify oracle update
cast call $COMPLIANCE_REGISTRY "complianceOracle()"
```

### 3. Post-Rotation Verification
- [ ] New oracle can sign compliance checks
- [ ] Old oracle cannot sign (test with old key)
- [ ] All compliance operations working
- [ ] Log rotation event in admin log

### 4. Emergency Procedures
If rotation fails:
1. Revert to previous oracle immediately
2. Investigate failure cause
3. Update runbook with lessons learned
4. Schedule retry with additional testing

## Security Notes
- Oracle rotation requires timelock approval
- New oracle must pass compliance verification
- Old oracle keys must be securely destroyed
- Rotation events logged for audit trail
