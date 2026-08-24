# HUSHAE Integration Matrix — Current Reality

## Payment Integrations

| Provider | Type | Adapter File | Credentials | Initiate | Callback | Signature Verify | Status Update | Refund | Idempotency | Status |
|----------|------|-------------|-------------|----------|----------|-----------------|---------------|--------|-------------|--------|
| **COD** | Manual | Built-in (orders.js) | None needed | N/A | N/A | N/A | ✅ Manual verify | N/A | N/A | **REAL — LIVE** |
| **JazzCash** | Gateway | `utils/paymentGateways.js` (144 lines) | Configurable via admin | ✅ HPP form POST | ✅ /callback/jazzcash | ✅ HMAC-SHA256 | ✅ Auto-confirm on Paid | ❌ Not implemented | ✅ Order.paymentStatus check | **ARCHITECTURE READY — NOT CONNECTED** |
| **SafePay** | Gateway | `utils/paymentGateways.js` | Configurable via admin | ✅ Redirect URL | ✅ /callback/safepay | ✅ API verify | ✅ Auto-confirm on Paid | ❌ Not implemented | ✅ transactionId check | **ARCHITECTURE READY — NOT CONNECTED** |
| **Bank Transfer** | Manual | Built-in (orders.js) | None needed | N/A | N/A | N/A | ✅ Manual verify | N/A | N/A | **REAL — LIVE** |

### JazzCash Adapter Evidence
```javascript
// utils/paymentGateways.js
isConfigured(cfg) → checks merchantId + password + integritySalt
initiate(order, cfg) → builds HPP POST payload with HMAC-SHA256 signing per JazzCash spec
verify(payload, cfg) → verifies inbound signature, checks pp_ResponseCode === '000'
```
- Sandbox endpoint: `https://sandbox.jazzcash.com.pk/CustomerPortal/...`
- Production endpoint: `https://payments.jazzcash.com.pk/CustomerPortal/...`
- **No verified merchant credentials exist in production**

### SafePay Adapter Evidence
```javascript
isConfigured(cfg) → checks apiKey + secret
initiate(order, cfg) → generates redirect URL with tracker token
verify(tracker, cfg) → calls SafePay API to verify payment status
```
- **No verified API credentials exist in production**

---

## Shipping Integrations

| Provider | Type | Rate API | Shipment API | Tracking | Label | Credentials | Status |
|----------|------|----------|-------------|----------|-------|-------------|--------|
| **Manual Shipping** | Built-in | N/A | N/A | Manual entry | N/A | N/A | **REAL — LIVE** |
| **TCS** | Courier | ❌ Not implemented | ❌ | ❌ | ❌ | ❌ None | **NOT IMPLEMENTED** |
| **Leopards** | Courier | ❌ Not implemented | ❌ | ❌ | ❌ | ❌ None | **NOT IMPLEMENTED** |
| **Trax** | Courier | ❌ Not implemented | ❌ | ❌ | ❌ | ❌ None | **NOT IMPLEMENTED** |
| **Pakistan Post** | Courier | ❌ Not implemented | ❌ | ❌ | ❌ | ❌ None | **NOT IMPLEMENTED** |

### Current Shipping Architecture
```
Settings.shippingMethods[] → configured by admin
  ├── id, name, rate, enabled, freeEligible
  └── Settings.freeShippingThreshold → free if afterPromotions >= threshold
  └── Settings.shippingFlatRate → default rate

Checkout: server calculates shippingCharge from settings
Order: stores shippingCharge (customer pays) + courierCost (actual cost, set later)
```

**No carrier API integration exists.** All shipping rates are manually configured. Tracking numbers are manually entered by admin.

---

## Communication Integrations

| Channel | Adapter File | Provider | Credentials | Send | Delivery Tracking | Consent | Status |
|---------|-------------|----------|-------------|------|-------------------|---------|--------|
| **SMTP Email** | `utils/mailer.js` | nodemailer | Configurable via admin/Settings | ✅ sendMail() | ⚠️ Accept/reject only | ✅ consent.email === OPTED_IN | **CONFIGURABLE** |
| **WhatsApp** | `utils/whatsapp.js` | Meta Cloud API | Configurable (phoneNumberId, accessToken) | ✅ Template messages | ⚠️ Provider response | ✅ consent.whatsapp | **ARCHITECTURE READY** |
| **SMS** | `utils/sms.js` | Generic HTTP API | Configurable | ✅ HTTP POST | ⚠️ Provider response | ✅ consent.sms | **ARCHITECTURE READY** |

### Email Evidence
- Uses nodemailer with SMTP transport
- Credentials from env vars OR Settings.integrations.email (database)
- Returns `{ skipped: true }` when no SMTP configured
- Marketing emails require `consent.email === 'OPTED_IN'`
- Transactional emails (order confirmation) have separate rules

### WhatsApp Evidence
- Adapter exists with Meta Cloud API integration
- Template message support
- Webhook verify token support
- **No verified Meta Business credentials in production**

### SMS Evidence
- Generic HTTP API adapter exists
- **No Pakistani SMS provider credentials (Twilio, SMSGateway, etc.)**

---

## Marketing Integrations

| Integration | Implemented | Connected | Production Live | Consent | Status |
|------------|-------------|-----------|-----------------|---------|--------|
| **Promotions Engine** | ✅ 647-line engine | ✅ Active | ✅ Yes | N/A | **REAL** |
| **Coupon System** | ✅ Enhanced targeting | ✅ Active | ✅ Yes | N/A | **REAL** |
| **Email Campaigns** | ✅ Draft/send workflow | ⚠️ SMTP required | ⚠️ If SMTP configured | ✅ Enforced | **PARTIAL** |
| **Banner System** | ✅ CRUD + slots + scheduling | ✅ Active | ✅ Yes | N/A | **REAL** |
| **Abandoned Cart Recovery** | ✅ Track + send | ⚠️ WhatsApp/SMTP required | ⚠️ If configured | ✅ Enforced | **PARTIAL** |
| **Customer Segments** | ✅ VIP/Repeat/New/Inactive | ✅ Active | ✅ Yes | N/A | **REAL** |
| **Customer Groups** | ✅ Rule-based | ✅ Active | ✅ Yes | N/A | **REAL** |
| **Analytics/Pixels** | ❌ Not implemented | ❌ | ❌ | N/A | **NOT IMPLEMENTED** |

---

## Platform Integrations

| Integration | Model | Lifecycle | Events | Scopes | Extensions Installed | Status |
|------------|-------|-----------|--------|--------|---------------------|--------|
| **Integration Registry** | Integration.js (7 seeded) | install→configure→enable→disable→uninstall | 30+ event types | 18 scope definitions | 0 third-party | **REAL (Level 4 code, Level 1 practice)** |
| **Webhook System** | WebhookEvent.js | Record→process→retry→dead-letter | HMAC signing | Provider-scoped | N/A | **REAL** |
| **API Keys** | ApiKey.js | Create→use→revoke | N/A | Scoped access | Unknown | **REAL** |
| **Event Bus** | extensionLifecycle.emitEvent() | Emit→filter→deliver | Internal + webhook | N/A | 0 subscribers | **REAL (unused)** |
| **Audit Log** | AuditLog.js | Record→query | N/A | N/A | N/A | **REAL** |
| **Backup System** | BackupSchedule.js | Schedule→trigger→verify→restore | N/A | N/A | N/A | **REAL (manual trigger)** |

---

## Analytics/Search Integrations

| Integration | Implemented | Connected | Data Source | Status |
|------------|-------------|-----------|-------------|--------|
| **PageView Tracking** | ✅ track.js | ✅ Active | PageView model | **REAL** |
| **Search Logging** | ✅ search.js | ✅ Active | SearchLog model | **REAL** |
| **Live View** | ✅ track.js /admin/live | ✅ Active | PageView (real-time-ish) | **REAL** |
| **Cohort Analysis** | ✅ analyticsService.js | ✅ Active | Order model | **REAL** |
| **Google Analytics** | ❌ Not implemented | ❌ | N/A | **NOT IMPLEMENTED** |
| **Facebook Pixel** | ❌ Not implemented | ❌ | N/A | **NOT IMPLEMENTED** |

---

## Integration Maturity Summary

| Category | Real & Live | Configurable | Architecture Ready | Not Implemented |
|----------|-------------|-------------|--------------------|-----------------|
| **Payments** | 2 (COD, Bank) | 0 | 2 (JazzCash, SafePay) | 0 |
| **Shipping** | 1 (Manual) | 0 | 0 | 4 (TCS, Leopards, Trax, PakPost) |
| **Communication** | 0 | 1 (SMTP) | 2 (WhatsApp, SMS) | 0 |
| **Marketing** | 5 | 1 | 0 | 1 (Pixels) |
| **Platform** | 6 | 0 | 0 | 0 |
| **Analytics** | 5 | 0 | 0 | 2 (GA, FB Pixel) |
| **TOTAL** | **19** | **2** | **4** | **7** |
