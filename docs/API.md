# COINSCIOUS BUILDING - API Documentation

## 🌐 API Overview

The COINSCIOUS platform provides a comprehensive REST API for managing security tokens, compliance, and payouts.

**Base URL**: `http://localhost:3001` (development)  
**Authentication**: JWT tokens  
**Content-Type**: `application/json`

---

## 🔐 Authentication

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "operator@coinscious.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "operator@coinscious.com",
    "role": "ADMIN"
  }
}
```

### Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer <token>
```

---

## 🏢 Properties Management

### List Properties
```http
GET /api/properties
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "prop_123",
      "name": "Downtown Office Building",
      "address": "123 Main St, New York, NY",
      "totalValue": 10000000,
      "tokenSupply": 1000000,
      "status": "ACTIVE"
    }
  ]
}
```

### Create Property
```http
POST /api/properties
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Office Building",
  "address": "456 Oak Ave, San Francisco, CA",
  "totalValue": 15000000,
  "description": "Modern office space in downtown SF"
}
```

### Get Property Details
```http
GET /api/properties/{propertyId}
Authorization: Bearer <token>
```

---

## 👥 Investor Management

### List Investors
```http
GET /api/investors
Authorization: Bearer <token>
Query Parameters:
- page: 1
- limit: 20
- search: "john"
- status: "ACTIVE"
```

### Create Investor
```http
POST /api/investors
Authorization: Bearer <token>
Content-Type: application/json

{
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "name": "John Doe",
  "email": "john@example.com",
  "accredited": true,
  "country": "US",
  "investmentLimit": 100000
}
```

### Update Investor Compliance
```http
PUT /api/investors/{investorId}/compliance
Authorization: Bearer <token>
Content-Type: application/json

{
  "accredited": true,
  "investmentLimit": 200000,
  "kycStatus": "VERIFIED"
}
```

### Freeze/Unfreeze Investor
```http
POST /api/investors/{investorId}/freeze
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Compliance review required"
}
```

---

## 🪙 Token Operations

### Mint Tokens
```http
POST /api/tokens/mint
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "0x1234567890123456789012345678901234567890",
  "amount": "1000",
  "partition": "REG_D",
  "reason": "Initial allocation"
}
```

### Transfer Tokens
```http
POST /api/tokens/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "from": "0x1234567890123456789012345678901234567890",
  "to": "0x2345678901234567890123456789012345678901",
  "amount": "100",
  "partition": "REG_D"
}
```

### Burn Tokens
```http
POST /api/tokens/burn
Authorization: Bearer <token>
Content-Type: application/json

{
  "from": "0x1234567890123456789012345678901234567890",
  "amount": "50",
  "reason": "Token buyback"
}
```

### Get Token Balance
```http
GET /api/tokens/balance/{address}
Authorization: Bearer <token>
```

---

## 💰 Payout Management

### Create Snapshot
```http
POST /api/payouts/snapshot
Authorization: Bearer <token>
Content-Type: application/json

{
  "propertyId": "prop_123",
  "description": "Q1 2024 Distribution"
}
```

### Fund Payout
```http
POST /api/payouts/fund
Authorization: Bearer <token>
Content-Type: application/json

{
  "snapshotId": "snap_123",
  "amount": "50000",
  "currency": "USDC",
  "mode": "FULL"
}
```

### Execute Distribution
```http
POST /api/payouts/distribute
Authorization: Bearer <token>
Content-Type: application/json

{
  "snapshotId": "snap_123"
}
```

### Get Payout History
```http
GET /api/payouts
Authorization: Bearer <token>
Query Parameters:
- propertyId: "prop_123"
- status: "COMPLETED"
- page: 1
- limit: 20
```

---

## 📊 Events & Monitoring

### Get Events
```http
GET /api/events
Authorization: Bearer <token>
Query Parameters:
- type: "TRANSFER"
- address: "0x1234..."
- fromDate: "2024-01-01"
- toDate: "2024-01-31"
- page: 1
- limit: 50
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "evt_123",
      "type": "TRANSFER",
      "from": "0x1234...",
      "to": "0x5678...",
      "amount": "100",
      "timestamp": "2024-01-15T10:30:00Z",
      "transactionHash": "0xabc123...",
      "blockNumber": 12345678
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

### Export Events
```http
GET /api/events/export
Authorization: Bearer <token>
Query Parameters:
- format: "csv" | "json"
- type: "TRANSFER"
- fromDate: "2024-01-01"
- toDate: "2024-01-31"
```

---

## 🔧 System Operations

### Get System Status
```http
GET /api/system/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "HEALTHY",
    "contracts": {
      "securityToken": "0x1234...",
      "complianceRegistry": "0x5678...",
      "payoutDistributor": "0x9abc..."
    },
    "network": "base-sepolia",
    "lastBlock": 12345678,
    "uptime": "2d 14h 30m"
  }
}
```

### Pause/Unpause System
```http
POST /api/system/pause
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Emergency maintenance"
}
```

### Get Health Check
```http
GET /api/health
```

---

## 📈 Analytics & Reporting

### Get Token Statistics
```http
GET /api/analytics/tokens
Authorization: Bearer <token>
Query Parameters:
- propertyId: "prop_123"
- period: "30d" | "90d" | "1y"
```

### Get Compliance Report
```http
GET /api/analytics/compliance
Authorization: Bearer <token>
Query Parameters:
- format: "json" | "pdf"
- fromDate: "2024-01-01"
- toDate: "2024-01-31"
```

### Get Payout Analytics
```http
GET /api/analytics/payouts
Authorization: Bearer <token>
Query Parameters:
- propertyId: "prop_123"
- period: "30d"
```

---

## 🔔 Webhooks

### KYC Webhook
```http
POST /api/webhooks/kyc
Content-Type: application/json
X-Signature: <hmac_signature>

{
  "investorId": "inv_123",
  "status": "APPROVED",
  "timestamp": "2024-01-15T10:30:00Z",
  "reason": "Documents verified"
}
```

### Compliance Webhook
```http
POST /api/webhooks/compliance
Content-Type: application/json
X-Signature: <hmac_signature>

{
  "investorId": "inv_123",
  "action": "FREEZE",
  "reason": "Suspicious activity detected",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🚨 Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient token balance for transfer",
    "details": {
      "required": "100",
      "available": "50"
    }
  }
}
```

### Common Error Codes
- `INSUFFICIENT_BALANCE` - Not enough tokens/funds
- `INVALID_ADDRESS` - Invalid wallet address
- `COMPLIANCE_VIOLATION` - Transfer blocked by compliance
- `INSUFFICIENT_PERMISSIONS` - User lacks required role
- `CONTRACT_ERROR` - Smart contract execution failed
- `RATE_LIMIT_EXCEEDED` - Too many requests

---

## 🔒 Security

### Rate Limiting
- **General API**: 100 requests/minute per IP
- **Authentication**: 5 attempts/minute per IP
- **Webhooks**: 1000 requests/minute per endpoint

### Authentication
- JWT tokens expire after 24 hours
- Refresh tokens expire after 7 days
- All sensitive operations require 2FA

### Webhook Security
- HMAC-SHA256 signature verification
- Idempotency key support
- IP whitelist (optional)

---

## 📚 SDK Examples

### JavaScript/Node.js
```javascript
import { CoinsciousAPI } from '@coinscious/api-client';

const api = new CoinsciousAPI({
  baseURL: 'http://localhost:3001',
  apiKey: 'your-api-key'
});

// Mint tokens
const result = await api.tokens.mint({
  to: '0x1234...',
  amount: '1000',
  partition: 'REG_D'
});
```

### Python
```python
from coinscious import CoinsciousAPI

api = CoinsciousAPI(
    base_url='http://localhost:3001',
    api_key='your-api-key'
)

# Get investor list
investors = api.investors.list(page=1, limit=20)
```

---

## 🆘 Support

- **API Issues**: Check response error messages
- **Authentication**: Verify JWT token validity
- **Rate Limits**: Implement exponential backoff
- **Webhooks**: Check HMAC signature verification

---

*Last Updated: January 2024*  
*Version: 1.0.0*
