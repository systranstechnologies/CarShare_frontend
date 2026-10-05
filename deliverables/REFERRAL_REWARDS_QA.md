# Referral, Rewards, Wallet and Redemption QA

## Test Data

Use separate owner, passenger, referrer, admin, device, and payment identities. Never use production bank details. Set reward to 100 coins, redemption limits to 100–10,000, and subscription usage to 50%.

## Functional And Referral Workflow

| ID | Scenario | Expected result |
|---|---|---|
| REF-01 | Register without a referral code | Immutable unique code, link, and zero-balance wallet are created. |
| REF-02 | Open `/register?ref=VALID_CODE` | Code is prefilled and submitted with registration. |
| REF-03 | Enter a valid code manually | Referral is `PENDING`; no coins are credited. |
| REF-04 | Enter an unknown code | Registration fails atomically with `INVALID_REFERRAL_CODE`. |
| REF-05 | Refer the same mobile/user twice | Unique constraints prevent a second referral/reward. |
| REF-06 | Refer self | Registration fails with `SELF_REFERRAL`. |
| REF-07 | Reuse device identity with same referrer | Referral is cancelled and fraud reason is recorded. |
| REF-08 | Referred passenger completes first accepted ride | Referral moves to `REWARDED` and referrer receives configured coins once. |
| REF-09 | Complete the same ride again/replay completion | No duplicate wallet transaction or reward. |
| REF-10 | Referred owner activates, posts, and completes a ride | Referrer receives one reward. |
| REF-11 | Registration only, booking only, or cancelled ride | No reward is issued. |

## Wallet And Ledger

| ID | Scenario | Expected result |
|---|---|---|
| WAL-01 | Credit referral reward | Available and lifetime totals increase; ledger balance matches wallet. |
| WAL-02 | Replay the same idempotency key | Balance is unchanged and no duplicate ledger row is created. |
| WAL-03 | Debit above available balance | API returns `INSUFFICIENT_COINS`; no balance changes. |
| WAL-04 | Concurrent debits near balance | At most the available balance is consumed; no negative balance. |
| WAL-05 | Admin positive/negative adjustment | Balance and ledger update; audit entry contains actor and amount. |
| WAL-06 | Open dashboard as a legacy user | Wallet and referral profile are provisioned lazily. |

## Redemption

| ID | Scenario | Expected result |
|---|---|---|
| RED-01 | Submit valid bank details and amount | Coins move available → redemption pending; status is `PENDING`. |
| RED-02 | Account confirmation mismatch | Request is rejected without changing wallet. |
| RED-03 | Invalid IFSC/account format | Server returns validation error. |
| RED-04 | Amount below/above configured limits | Request is rejected. |
| RED-05 | Amount exceeds available coins | Request is rejected with no negative balance. |
| RED-06 | `PENDING → PROCESSING → PAID → CLOSED` | Every transition is recorded; paid coins move pending → redeemed. |
| RED-07 | Reject pending/processing request | Coins return once to available and user is notified. |
| RED-08 | Replay transition or skip a state | API returns `INVALID_TRANSITION`. |
| RED-09 | View request as user | Account is masked; encrypted values are never returned. |
| RED-10 | Export as admin | CSV downloads with authorized operational fields. |

## Subscription Coin Usage

| ID | Scenario | Expected result |
|---|---|---|
| SUB-01 | ₹500 fee, 220 coins, 50% setting | 220 coins reserved; online payable is ₹280. |
| SUB-02 | ₹500 fee, 700 coins | 250 coins reserved; online payable is ₹250; 450 remain. |
| SUB-03 | ₹1,000 fee, 2,000 coins | 500 coins reserved; online payable is ₹500. |
| SUB-04 | Payment webhook succeeds | Reserved coins move pending → used exactly once. |
| SUB-05 | Webhook is replayed | No second coin settlement. |
| SUB-06 | Provider payment fails/admin rejects UTR | Reserved coins return to available. |
| SUB-07 | Paid subscription is refunded | Applied coins return through a refund ledger entry. |
| SUB-08 | Admin changes percentage to 25% | New checkout cap and UI text use 25%; existing checkout is unchanged. |

## API And Security

- Verify all `/api/rewards/**` endpoints require a valid JWT.
- Verify all `/api/admin/rewards/**` endpoints reject passenger and owner tokens with 403.
- Verify malformed UUIDs, negative amounts, oversized strings, and unknown statuses return 4xx.
- Verify reward endpoints return 429 after the configured token-bucket limit.
- Verify bank account and IFSC columns contain AES-GCM ciphertext, not plaintext.
- Verify logs, audit details, notification payloads, and user responses never contain full bank account numbers.
- Verify SQL injection strings are treated as data by JPA queries.
- Verify concurrent reward, redemption, and subscription operations preserve wallet invariants.
- Verify encryption key rotation is rehearsed before production rotation; existing ciphertext requires a migration strategy.

## Notifications

Verify in-app and configured push delivery for referral registered, qualified, reward credited, redemption submitted, paid, rejected, and subscription coin settlement. Confirm the route opens `/referrals` or the owner dashboard. Email delivery requires a configured mail provider and is not enabled by the current repository.

## Mobile And Responsive

Test at 320×568, 360×800, 390×844, 768×1024, 1024×768, and 1440×900. Confirm no horizontal overflow except admin data tables, tap targets remain usable, long links truncate safely, forms remain visible above the software keyboard, and native Web Share opens installed compatible apps on Android/iOS. Confirm copy fallback on browsers without Web Share.

Run `npm run apk:sync`, build a debug APK, and test deep link referral registration, login persistence, offline/error states, share cancellation, clipboard denial, push routes, and payment return navigation on at least one physical Android device.

## Performance

- Seed 1 million wallet transactions and verify indexed user history remains paginated/limited.
- Seed 100,000 referrals/redemptions and verify admin search/export memory usage.
- Load-test dashboard reads, reward completion, and redemption submission at expected peak ×3.
- Verify no duplicate ledger rows under concurrent completion/webhook replays.

## UAT

1. Passenger shares a code; invitee registers from the link and sees the code prefilled.
2. Referrer sees pending referral with no immediate coins.
3. Invitee completes a ride; referrer receives one notification and wallet credit.
4. Owner applies coins to a subscription and pays the mandatory remainder.
5. Passenger submits redemption and sees masked banking details and pending status.
6. Admin processes and pays redemption; user sees paid status and notification.
7. Admin rejects another request; user balance is restored.
8. Admin changes settings without deployment and new requests use those values.
9. Support tickets can be raised for referral, redemption, wallet, ride, booking, payment, subscription, and technical issues.

## Regression Checklist

- Registration/login/OTP/Didit flows for both roles.
- Existing owner subscription without coins.
- Ride creation, female-only visibility, search, booking, acceptance, completion, cancellation, and rating.
- Owner/passenger profiles and navigation.
- Existing admin subscriptions, users, rides, tickets, verification, and exports.
- Push/in-app notifications and unread counts.
- Android build, Capacitor sync, service worker, and production web build.
- Database backup/restore and rollback rehearsal before enabling Flyway in production.
