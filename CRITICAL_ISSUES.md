# Critical Issues & Edge Cases Review

**Date:** August 29, 2026  
**Status:** Production Readiness Assessment

---

## 1. Critical Issues (Blocking)

### 1.1 Backend API Implementation Required ❌

**Issue:** Frontend expects these backend endpoints that may not exist:
```
POST /v1/users/{userId}/didit/session
GET /v1/users/{userId}/didit/status
POST /v1/admin/didit/{id}/approve
POST /v1/admin/didit/{id}/reject
GET /v1/admin/subscriptions
POST /v1/admin/subscriptions/{id}/approve
POST /v1/admin/subscriptions/{id}/reject
```

**Impact:** HIGH - Application will fail at verification stage  
**Action Required:**
- [ ] Implement all admin approval endpoints
- [ ] Implement Didit session creation & status check
- [ ] Implement subscription approval workflow
- [ ] Add proper error handling for failed requests

**Test Case:**
```javascript
// Should succeed:
POST /v1/users/1/didit/session with role=OWNER
Response: {data: {sessionId: "xxx", verificationUrl: "https://didit..."}}

// Should fail gracefully:
GET /v1/users/999/didit/status (non-existent user)
Response: {error: "User not found"}
```

---

### 1.2 Didit Webhook Integration Missing ❌

**Issue:** Admin review modal cannot be tested without Didit providing async updates

**Impact:** HIGH - Verification status won't update without webhook  
**Current Flow:**
```
1. Admin approves in dashboard
2. Backend updates didit_verifications.admin_decision = 'APPROVE'
3. Frontend polls every 5 seconds
4. Status updates in UI
```

**Problem:** Without webhook, status update is manual only. If Didit updates externally, frontend won't know.

**Action Required:**
- [ ] Implement backend webhook handler for Didit callbacks
- [ ] Webhook receives: {sessionId, status, verifiedUser}
- [ ] Update verification record & notify frontend
- [ ] Handle retries & failure cases
- [ ] Implement signature validation (Didit signs webhooks)

**Test Case:**
```bash
# Simulate Didit webhook:
curl -X POST http://localhost:8080/api/v1/webhooks/didit \
  -H "Content-Type: application/json" \
  -H "X-Didit-Signature: {signature}" \
  -d '{"sessionId": "xxx", "status": "VERIFIED", "verifiedUser": {...}}'
```

---

### 1.3 MockDataService vs Real HTTP Calls ⚠️

**Issue:** Frontend uses MockDataService for API calls, which returns mock data only

**Code:**
```typescript
// Current (mock):
this.data.getAdminDiditVerifications().subscribe(...)

// Expected (real):
this.http.get('/api/v1/admin/didit/verifications').subscribe(...)
```

**Impact:** MEDIUM - All API calls will return mock data in production  
**Action Required:**
- [ ] Replace MockDataService with actual HttpClient calls
- [ ] Update all API endpoints to match backend
- [ ] Configure API base URL in environment.prod.ts
- [ ] Add proper error handling & retry logic

---

### 1.4 Notification Service Not Fully Integrated ⚠️

**Issue:** Users won't be notified of verification/subscription status changes

**Current Code:**
```typescript
// In approveDiditReview:
this.toast.show('Verification approved', 'success'); // Only toast
// Should also:
this.notificationService.sendPushNotification(userId, 'Your verification was approved!');
this.notificationService.sendEmail(userEmail, 'Verification Approved');
```

**Impact:** MEDIUM - Poor user experience without notifications  
**Action Required:**
- [ ] Implement push notification call in admin approval
- [ ] Implement email notification for rejections (with reason)
- [ ] Add SMS notification support
- [ ] Backend must call notification service

---

## 2. Edge Cases & Flow Issues

### 2.1 User Tries to Access Protected Routes Before Verification

**Scenario:** User bypasses registration and goes directly to `/home`

**Current Code:**
```typescript
// OnboardingGuard.canActivate():
if (!this.onboarding.canPassengerSearchAndBook()) {
  this.router.navigateByUrl('/');  // Redirect to home
  return false;
}
```

**Issue:** Infinite loop - redirects to `/`, then tries to load `/home` again  
**Fix:**
```typescript
if (!this.onboarding.canPassengerSearchAndBook()) {
  this.router.navigateByUrl('/auth'); // Go to auth, not home
  return false;
}
```

**Test:** `ng serve` → Open DevTools → Navigate to `/home` → Should go to auth, not loop

---

### 2.2 User Registers, But Verification Takes Long Time

**Scenario:** Admin is offline for 2 hours, user can't complete onboarding

**Current Flow:**
```
1. User completes Didit verification
2. System marks as UNDER_REVIEW
3. Polling continues every 5 seconds
4. Admin logs in, approves
5. Next poll gets APPROVED
6. User sees success message
```

**Issue:** If user closes browser, polling stops. Status won't update on next login.

**Fix:** Store verification session ID in backend linked to user. On next login, resume polling.

**Test Case:**
```
1. Register → Complete verification → Status = UNDER_REVIEW
2. Close browser
3. Reopen app next day
4. Navigate to /owner/verification-status
5. Should resume polling from where it left off
```

---

### 2.3 Owner Rejects Subscription Payment, Tries Again

**Scenario:** Admin rejects subscription. Owner wants to retry with different payment method.

**Current Flow:**
```
Status: REJECTED
User navigates to: /owner/plans
Expected: Can select new plan
Actual: Form might still show old rejection reason
```

**Issue:** No "Clear rejection & retry" UI

**Fix:** Add button in subscription widget:
```html
<div *ngIf="subscriptionStatus === 'REJECTED'">
  <button (click)="clearRejection()">Try a different payment method</button>
</div>
```

**Test Case:**
```
1. Submit subscription → Rejected
2. Should show clear error + retry option
3. Retry should reset status to blank form
```

---

### 2.4 Admin Approves User Twice (Race Condition)

**Scenario:** Admin clicks "Approve" button twice very quickly

**Current Code:**
```typescript
approveDiditReview(review: any, comment = 'Approved by admin review.') {
  this.data.approveDiditReview(review.id, comment).subscribe({
    next: () => {
      this.toast.show('Verification approved', 'success');
      this.selectedReview = null;
      this.loadVerifications(); // Reload table
    },
    error: () => this.toast.show('Approval failed', 'error')
  });
}
```

**Issue:** 
- First click: Sends approval request
- Second click: Sends another approval request before first completes
- Backend might process both

**Fix:**
```typescript
private approvalInProgress = false;

approveDiditReview(review: any, comment = 'Approved by admin review.') {
  if (this.approvalInProgress) {
    this.toast.show('Approval in progress...', 'warning');
    return;
  }
  this.approvalInProgress = true;
  this.data.approveDiditReview(review.id, comment).subscribe({
    next: () => {
      this.toast.show('Verification approved', 'success');
      this.selectedReview = null;
      this.loadVerifications();
      this.approvalInProgress = false;
    },
    error: () => {
      this.toast.show('Approval failed', 'error');
      this.approvalInProgress = false;
    },
    complete: () => this.approvalInProgress = false
  });
}
```

**Test:** Click approve button multiple times rapidly → Should show "in progress" warning

---

### 2.5 User Registers Twice (Duplicate Account Risk)

**Scenario:** User registers with same mobile number twice

**Current Code (auth.component.ts):**
```typescript
this.auth.authenticate('register', 'passenger', this.mobile, ...)
  .subscribe({
    next: (session) => { /* create account */ },
    error: (error) => {
      const code = error?.error?.error?.code;
      if (code === 'DUPLICATE_USER') {
        this.toast.show('Mobile already registered. Please log in.', 'warning');
        this.isRegistering = false;
      }
    }
  });
```

**Good:** Already handles DUPLICATE_USER error  
**Test:** Try registering with same mobile twice → Should show warning

---

### 2.6 Didit Verification Takes 24+ Hours

**Scenario:** Didit manual review queue is backlogged

**Current UX:**
```
User sees: "We are checking your verification details. Please wait..."
Polling: Every 5 seconds
Status: Still UNDER_REVIEW after 24 hours
```

**Issue:** User doesn't know if they should wait or if something broke

**Fix:** Add timeout & escalation:
```typescript
private startPolling() {
  const maxAttempts = 24 * 60 / 5; // 24 hours at 5-sec intervals
  let attempts = 0;
  
  this.poll = interval(5000).pipe(
    startWith(0),
    switchMap(() => this.didit.getStatus()),
    takeWhile(() => attempts++ < maxAttempts)
  ).subscribe({
    next: result => { /* update status */ },
    complete: () => {
      if (this.status === 'UNDER_REVIEW') {
        this.showContactSupport();
      }
    }
  });
}

showContactSupport() {
  this.toast.show(
    'Verification is taking longer than expected. Please contact support.',
    'warning'
  );
  // Navigate to support form
}
```

**Test:** Simulate slow backend response → After 24 hours, show escalation message

---

### 2.7 Passenger vs Owner Flow Confusion

**Scenario:** Passenger completes registration but tries to access `/owner/plans`

**Current Route:**
```
/owner/plans - NO GUARD
Any authenticated user can access
```

**Issue:** Passenger can see owner subscription UI

**Fix:** Add role check in route guard:
```typescript
const route: Route = {
  path: 'owner/plans',
  component: SubscriptionPlansComponent,
  canActivate: [
    OnboardingGuard,
    RoleGuard // NEW: Check role === 'owner'
  ]
};
```

**Test:** Login as passenger → Try `/owner/plans` → Should redirect

---

### 2.8 Browser Cache Stale State

**Scenario:** User completes verification on mobile, then logs in on desktop

**Current Code:**
```typescript
// auth.component.ts
if (s) {
  if (s.role === 'admin') this.router.navigateByUrl('/Kumaresh/dashboard');
  else if (s.role === 'owner') this.router.navigateByUrl('/owner/dashboard');
}
```

**Issue:** Session state is cached in AuthService. Desktop browser gets old cached state.

**Fix:** Fetch fresh state from backend:
```typescript
constructor(private auth: AuthService, ...) {
  const s = this.auth.current;
  if (s) {
    // Sync with backend to get latest state
    this.auth.refreshSession().subscribe(freshSession => {
      if (freshSession) {
        // Use fresh state for navigation
      }
    });
  }
}
```

**Test:** Complete verification on phone → Check desktop → Should get latest state

---

## 3. Missing Error Scenarios

### Scenario: Network Error During Verification Poll

**Current Code:**
```typescript
switchMap(() => this.didit.getStatus()).subscribe({
  next: result => { /* update */ },
  error: () => {} // SILENTLY IGNORES ERROR
});
```

**Fix:**
```typescript
error: (err) => {
  console.warn('Verification polling error:', err);
  // Continue polling, but show visual indicator of connection issue
  this.connectionError = true;
}
```

---

### Scenario: Expired Session During Admin Review

**Issue:** Admin's session expires while reviewing. Click approve → 401 Unauthorized

**Fix:** Implement token refresh in interceptor:
```typescript
// In auth.interceptor.ts
if (error.status === 401) {
  return this.auth.refreshToken().pipe(
    switchMap(() => this.http.request(req)),
    catchError(() => {
      this.router.navigateByUrl('/Kumaresh/login');
      return throwError(error);
    })
  );
}
```

---

## 4. Performance Issues

### 4.1 Large Verification Records List

**Scenario:** Admin has 10,000 pending verifications

**Current Code:**
```typescript
loadVerifications() {
  this.data.getAdminDiditVerifications().subscribe({
    next: rows => {
      this.verifications = rows || []; // ALL records loaded at once
    }
  });
}
```

**Fix:** Implement pagination
```typescript
verifications: any[] = [];
pageSize = 20;
currentPage = 0;

loadVerifications() {
  this.data.getAdminDiditVerifications(this.currentPage, this.pageSize)
    .subscribe(rows => this.verifications = rows);
}

nextPage() {
  this.currentPage++;
  this.loadVerifications();
}
```

---

## 5. Build & Deployment Issues

### 5.1 Bundle Size Exceeds Budget ⚠️

```
Current: 617.44 kB
Budget: 500 kB
Over: 117.44 kB
```

**Actions:**
- [ ] Remove unused dependencies
- [ ] Tree-shake qrcode module
- [ ] Lazy-load admin components more aggressively
- [ ] Consider code splitting

---

### 5.2 QRCode CommonJS Optimization Warning

```
Module 'qrcode' used by 'src/app/app.component.ts' is not ESM
```

**Fix:**
- [ ] Replace qrcode with ESM alternative: `qr-code`
- [ ] Or configure esbuild to optimize CommonJS

---

## 6. Security Concerns

### 6.1 Raw Didit Payload Exposed in Admin UI

**Issue:**
```html
<pre>{{ review.rawPayloadJson }}</pre>  <!-- Contains sensitive data -->
```

**Risk:** Admin might accidentally expose via screenshot/logging

**Fix:** Hide by default, show in separate secure view:
```html
<button (click)="showPayload = !showPayload">View verification details</button>
<pre *ngIf="showPayload && isAdmin">{{ review.rawPayloadJson }}</pre>
```

---

### 6.2 No Audit Trail for Admin Actions

**Issue:** No logging of who approved/rejected verifications

**Fix:** Backend must log:
```
[2026-08-29 14:30:22] ADMIN admin_user_1 APPROVED verification_123
  User: john_doe
  Reason: Document valid
  IP: 192.168.1.100
  Timestamp: 2026-08-29 14:30:22
```

---

## Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Backend APIs | ✅ 1 | ✅ 2 | ⚠️ 2 | |
| Edge Cases | | ✅ 2 | ⚠️ 5 | |
| Performance | | | ⚠️ 1 | |
| Security | | | ⚠️ 2 | |
| Build | | | ⚠️ 2 | |

---

## Deployment Readiness: 🔴 NOT READY

**Blockers to Resolve:**
1. ✅ Backend APIs for Didit session & admin approval
2. ✅ Didit webhook integration
3. ✅ Replace MockDataService with real HTTP calls
4. ✅ Notification service integration
5. ✅ Error handling for network issues
6. ✅ Test all edge cases

---

**Next Steps:** 
1. Implement all backend endpoints
2. Fix critical edge cases (#2.1)
3. Add comprehensive error handling
4. Run end-to-end testing in staging
5. Load testing with concurrent verifications
6. Security audit of admin dashboard
7. User acceptance testing with mock Didit flows
