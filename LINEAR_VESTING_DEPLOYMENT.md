# LinearVesting Contract Deployment Guide

## 🎯 **Contract Overview**

**LinearVesting.sol** - A clean, gas-efficient vesting contract for the COINSCIOUS pilot.

### **Key Features:**
- ✅ Linear vesting over configurable duration
- ✅ Cliff period before vesting starts  
- ✅ ReentrancyGuard protection
- ✅ Event emission for Supabase indexing
- ✅ Immutable token reference

---

## 📋 **Deployment Steps**

### **Step 1: Deploy SecurityToken First**
LinearVesting depends on SecurityToken, so deploy SecurityToken first:
- name: "COINSCIOUS Security Token"
- symbol: "COIN"  
- owner: 0x57F6251028d290730CeE7E622b2967e36Fd7D00a
- complianceRegistry: 0xCC602E09ab7961d919A1b0bb6a4452a9F860d488

### **Step 2: Deploy LinearVesting**
**Constructor Parameters:**
- `_token`: [SecurityToken address from Step 1]

**Example:**
```solidity
// If SecurityToken is deployed at 0x1234...
LinearVesting vesting = new LinearVesting(0x1234...);
```

---

## 🧪 **Testing Vesting Flow**

### **Test Scenario: 4-Year Vesting with 1-Year Cliff**

**1. Create Vesting Schedule:**
```solidity
// Parameters for founder vesting
uint256 totalAmount = 100000 * 10**18; // 100k COIN tokens
uint64 start = uint64(block.timestamp); // Start now
uint64 cliff = uint64(block.timestamp + 365 days); // 1 year cliff
uint64 duration = 4 * 365 days; // 4 year total vesting

vesting.createVesting(
    beneficiaryAddress,
    totalAmount,
    start,
    cliff,
    duration
);
```

**2. Test Release After Cliff:**
```solidity
// After 1 year passes
vesting.release();
```

**3. Check Vested Amount:**
```solidity
uint256 vested = vesting.vestedAmount(beneficiaryAddress);
```

---

## 📊 **Expected Events for Supabase**

### **VestingCreated Event:**
```solidity
event VestingCreated(
    address indexed beneficiary, 
    uint256 totalAmount, 
    uint64 start, 
    uint64 cliff, 
    uint64 duration
);
```

### **TokensReleased Event:**
```solidity
event TokensReleased(
    address indexed beneficiary, 
    uint256 amount
);
```

---

## 🎯 **Pilot Integration**

### **Deployment Order:**
1. ✅ MockUSDC (completed)
2. ✅ ComplianceRegistry (completed)  
3. 🚧 SecurityToken (in progress)
4. ⏳ LinearVesting (pending)

### **Testing Sequence:**
1. Deploy LinearVesting
2. Create vesting schedule for test beneficiary
3. Verify events appear in Supabase
4. Test release function (after cliff)
5. Confirm end-to-end flow

---

## 🔧 **Contract Addresses to Update**

Once deployed, update these files:
- `DEPLOYED_ADDRESSES.json`
- `.env` file (if needed)
- `PILOT_STATUS.md`

---

*Ready for deployment once SecurityToken is deployed!* 🚀
