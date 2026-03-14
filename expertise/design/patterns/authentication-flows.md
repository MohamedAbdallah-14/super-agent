# Authentication Flows — Design Pattern Module

> **Module Type:** Pattern
> **Domain:** UI/UX Design Systems
> **Last Updated:** 2026-03-07
> **Standards:** Apple HIG, Material Design 3, NIST SP 800-63B-4, WCAG 2.2, FIDO Alliance Design Guidelines
> **Confidence:** High — synthesized from official platform guidelines, peer-reviewed usability research, and industry case studies

---

## Quick Reference Checklist

### Forms & Input
- [ ] Every input has a visible `<label>` element (not placeholder-only)
- [ ] `autocomplete` attributes set (`username`, `current-password`, `new-password`, `one-time-code`)
- [ ] Password visibility toggle present on all password fields
- [ ] Password manager autofill not blocked (no `readonly`, no paste-prevention)
- [ ] Email field uses `type="email"` with `inputmode="email"`
- [ ] OTP field uses `inputmode="numeric"` with `autocomplete="one-time-code"`

### Error Handling
- [ ] Errors appear inline next to the relevant field
- [ ] Error messages use `aria-live="polite"` for screen reader announcement
- [ ] User input preserved after failed submission (never clear typed email/password)
- [ ] Generic error for wrong credentials ("Invalid email or password") — never reveal which field is wrong
- [ ] Focus moves to first error or error summary on submission failure

### Security & Standards
- [ ] Minimum password length: 15 characters (NIST 800-63B-4 single-factor), 8 characters (multi-factor)
- [ ] No composition rules (no forced uppercase/lowercase/special character requirements)
- [ ] No periodic password expiration unless compromise detected
- [ ] Passwords checked against breach/common-password lists
- [ ] Rate limiting on login attempts with progressive delays
- [ ] Session timeout with advance warning and extension option

### Accessibility
- [ ] Entire flow navigable by keyboard alone (Tab, Enter, Escape)
- [ ] CAPTCHA has an accessible alternative (audio, proof-of-work, or honeypot)
- [ ] Time limits for verification codes are generous (minimum 10 minutes)
- [ ] Color is not the only indicator of password strength or error state
- [ ] Touch targets minimum 44x44pt (iOS) / 48x48dp (Android)

### Cross-Platform
- [ ] Sign in with Apple offered when third-party login is present (App Store guideline 4.8)
- [ ] Passkey support with Conditional UI / autofill integration
- [ ] Biometric opt-in prompt after first successful traditional login
- [ ] Deep link handling for magic links works across browsers and apps

---

## 1. Pattern Anatomy

### 1.1 Sign Up (Registration)

**Flow:** `[Landing] -> [Registration Form] -> [Email Verification] -> [Onboarding] -> [Authenticated State]`

**Key principles:**
- Minimize fields. Every additional field reduces completion by ~10% (Baymard Institute). Collect only what is essential; defer everything else to onboarding.
- Show password requirements upfront as a real-time checklist, not after failure.
- Never require password confirmation fields. Provide a visibility toggle instead.
- Pre-fill known data (e.g., email from invitation links).

**NIST 800-63B-4 password requirements:**
- Minimum 15 characters (sole authenticator) or 8 characters (with second factor)
- Maximum of at least 64 characters must be supported
- No composition rules (no forced uppercase/special character mix)
- No periodic expiration unless breach detected
- Must check against known-breach lists and common passwords
- Unicode characters including spaces and emojis must be accepted

### 1.2 Sign In (Login)

**Flow:** `[Sign-in Form] -> [Credential Validation] -> [MFA Challenge (if enabled)] -> [Authenticated State]`

**Key principles:**
- Single-page login (email + password on one screen) is the default best practice. It works with password managers, is faster, and reduces cognitive load.
- Identifier-first (two-page) is justified only when routing to different backends (SSO detection, federated identity). If used, support autofill across both pages.
- "Remember me" should default to ON for consumer apps. Default OFF only for banking, healthcare, or shared-device contexts.
- Position "Forgot password?" adjacent to the password field, not at the bottom of the form.

### 1.3 Password Reset

**Flow:** `[Forgot Password] -> [Enter Email] -> [Confirmation] -> [Email with Reset Link] -> [New Password Form] -> [Auto-login]`

- Pre-fill email if the user already typed it on the login form.
- Confirmation screen: "If an account exists with this email, we've sent a reset link" — never confirm/deny account existence.
- Reset links expire after 30-60 minutes, single-use.
- After reset, auto-sign the user in. Invalidate all other sessions.

### 1.4 Email Verification

**Flow:** `[Registration Complete] -> [Verification Pending] -> [User Opens Email] -> [Click Link] -> [Verified State]`

- Allow limited app access before verification (view-only mode). Blocking all access increases drop-off.
- Provide "Resend verification" button with 60-second cooldown.
- Handle cross-device link opening: show success message with "Return to app" button.
- Verification links expire after 24-72 hours.

### 1.5 Social Login (OAuth)

**Flow:** `[Login Screen] -> [Select Provider] -> [Redirect to Provider] -> [Authorize] -> [Redirect Back] -> [Authenticated State]`

- Use official branded buttons following each provider's strict brand guidelines.
- Display social options above email/password form with a visual divider ("or").
- Limit to 2-4 providers to avoid decision paralysis.
- Handle account collision: when social login email matches an existing account, prompt the user to link (see Section 3.4).
- Request minimum scopes (email + basic profile only).

**App Store Guideline 4.8:** If any third-party social login is offered, you must also offer an option meeting Apple's privacy criteria (limits data to name/email, allows email privacy, no ad tracking). Sign in with Apple satisfies this but is no longer the only acceptable option.

### 1.6 Passwordless — Magic Links

**Flow:** `[Enter Email] -> [Send Link] -> ["Check your email"] -> [Click Link] -> [Authenticated State]`

- Links expire in 10-15 minutes, single-use.
- Handle cross-device scenarios: present a confirmation button rather than auto-authenticating when opened in a different browser.
- Offer a code-based fallback (6-digit OTP alongside the magic link) for email clients that mangle links.
- Calendly reported registration completion increasing from 43% to 71% after switching to magic links, with mobile users converting 3x better.

### 1.7 Passwordless — Passkeys (WebAuthn)

**Conditional UI flow:** `[Page Loads] -> [Browser Shows Passkey in Autofill] -> [User Selects] -> [Biometric/PIN] -> [Authenticated]`

**FIDO Alliance Design Guidelines:**
- Use identifier-first approach: user enters email, system checks for registered passkey.
- Implement Conditional UI (autofill integration) — this is the highest-conversion pattern.
- Do NOT rely on a separate "Sign in with Passkey" button alone — research shows low adoption and confusion. Integrate into the existing login flow.
- Use the canonical FIDO Alliance passkey icon consistently.
- Offer passkey creation after successful sign-up, not during. Frame as convenience: "Sign in faster next time with your fingerprint or face."
- Always provide a fallback (password, magic link, OTP).

### 1.8 Multi-Factor Authentication (MFA)

**TOTP Setup:** `[Settings] -> [Enable 2FA] -> [QR Code + Manual Key] -> [Scan] -> [Verify Code] -> [Recovery Codes] -> [Active]`
**TOTP Login:** `[Password OK] -> [Enter 6-Digit Code] -> [Authenticated]`

- Show both QR code and manual text key. After setup, show 8-10 single-use recovery codes with download/copy option.
- Use `inputmode="numeric"` and `autocomplete="one-time-code"` on OTP inputs.
- Accept codes from adjacent time windows (current +-1 period) for clock skew.

**SMS OTP:** NIST 800-63B-4 classifies SMS as a "restricted" authenticator — acceptable but discouraged for high-value scenarios due to SIM-swap vulnerability. Show last 4 digits of phone number. Provide "Resend" with 60-second cooldown.

**Push Notification:** Include context in the push (IP, location, device). Implement number matching to prevent MFA fatigue/prompt-bombing. Always provide TOTP or recovery code fallback.

### 1.9 Biometric Authentication

- Always use the system-provided biometric prompt (Face ID sheet, BiometricPrompt bottom sheet) — never custom modals. System UI provides instant trust.
- Biometric should be opt-in, offered after first successful traditional login.
- Always provide fallback: PIN, password, or pattern.
- Biometric data never leaves the device; app receives only pass/fail from OS secure hardware.
- Average biometric unlock: 0.5 seconds vs. 6-12 seconds for password entry.

### 1.10 Single Sign-On (SSO)

**Flow:** `[Enter Email] -> [SSO Detected via Domain] -> [Redirect to IdP] -> [Authenticate] -> [SAML/OIDC Assertion] -> [Redirect Back] -> [Authenticated]`

- Use email domain detection to auto-route users to the correct IdP.
- Hide the password field for SSO-enforced domains.
- Support JIT (Just-In-Time) provisioning: auto-create accounts for users who authenticate via SSO but lack an existing account.

---

## 2. Best-in-Class Examples

### 2.1 Apple — Privacy as a Feature
Sign in with Apple provides email relay ("Hide My Email"), generating a unique random forwarding address. Face ID/Touch ID is the default for returning users. Passkeys sync across devices via iCloud Keychain. Button design is strictly standardized (SF Pro, specific sizing/colors).

### 2.2 Google — Adaptive Authentication
Identifier-first flow justified by routing needs (Google accounts, workspace SSO, passkeys). One Tap sign-in provides a low-friction overlay on partner sites. Among the first to deploy passkeys at scale with Conditional UI. Security challenges adapt dynamically — push, TOTP, SMS, security key, or number matching — selecting the lowest-friction, highest-security method available.

### 2.3 Stripe — Transparent Session Management
Clean single-page login. Clear "Remember this device" explanation. Dashboard shows all active sessions with device info, location, and revocation capability. API keys use color-coded test/live distinction. MFA setup is streamlined with mandatory recovery code download.

### 2.4 Linear — Context-Adaptive Auth
Email-first flow routes to password, magic link, Google SSO, or SAML based on workspace config. Magic link is a first-class option (not a fallback), matching their email-adjacent workflow. Workspace detection auto-routes after email entry. Same login page serves individuals, small teams, and enterprise SSO.

### 2.5 1Password — Recovery as First-Class UX
The "Secret Key" (128-bit) supplements the master password, so neither alone can access the vault. The "Emergency Kit" PDF is designed for physical storage — a proactive answer to "what if I lose everything." Biometric unlock for returning sessions. Acts as both a passkey consumer and a passkey manager.

### 2.6 Slack — Multi-Tenancy Done Right
Workspace-first flow matches the mental model of "signing into my team." Magic link is the default for many users. Multi-workspace simultaneous sessions with easy switching. Admins can enforce SSO and disable password login, with clear UI messaging.

### 2.7 GitHub — Mandatory Security Without Revolt
2023-2024 mandatory MFA rollout succeeded through: advance notice, multiple setup reminders, grace period, and support for TOTP, SMS, security keys, and GitHub Mobile push. Clear passkey upgrade prompts. Device verification with email codes and device info. Fine-grained API token permissions with visual selector.

### 2.8 Vercel — Passwordless-First
No password creation during sign-up — email verification code or magic link by default. Social login (GitHub, GitLab, Bitbucket) matches their developer user base. Proves passwordless-first is viable for a production platform.

---

## 3. User Flow Mapping

### 3.1 Happy Paths

**Email/Password Sign-Up:** User clicks "Sign up" -> enters email -> creates password (sees real-time strength meter) -> agrees to terms -> submits -> checks email -> clicks verification link -> sees onboarding.

**Social Login:** User clicks "Continue with Google" -> redirected to consent screen -> selects account -> grants permissions -> redirected back -> account created -> sees onboarding.

**Magic Link:** User enters email -> clicks "Send magic link" -> opens email -> clicks link -> token validated -> dashboard.

**Passkey (Conditional UI):** User taps email field -> browser shows passkey in autofill -> selects passkey -> biometric confirmation -> dashboard.

**MFA (TOTP):** User enters email/password -> credentials valid -> enters 6-digit code from authenticator -> dashboard.

### 3.2 Error Flows

**Wrong Password:** Error inline: "Invalid email or password." Email preserved, password cleared, cursor in password field. After 5 failures: progressive delay (2s, 4s, 8s). After 10: lockout (15-30 min) with reset password link.

**Account Locked:** Form disabled with clear message and timer. "Reset password" link prominent. Email notification sent to account owner.

**Expired Link:** "This link has expired." Provide "Send a new link" button with pre-filled email.

**Unverified Email:** Credentials accepted but session restricted. Banner with "Resend verification" button. Limited access granted.

**Invalid MFA Code:** "Invalid code. Please try again." After 3 failures: suggest recovery code. After 5: temporary MFA lockout. "Lost access?" link always visible.

### 3.3 Recovery Flows

**Forgot Password:** Click "Forgot password?" -> email pre-filled from login form -> "If an account exists, we've sent a link" -> click reset link (30-60 min expiry) -> create new password -> auto-login -> all other sessions invalidated -> confirmation email sent.

**Lost 2FA Device:** Option 1: Enter one of the saved recovery codes (single-use). Option 2: SMS fallback if configured. Option 3: Contact support with identity verification. All options lead to re-authentication and prompt to set up new 2FA.

### 3.4 Edge Cases

**Account Collision (Same Email):** User signs in with Google, email matches existing password account -> prompt: "An account exists. Sign in with your password to link." -> accounts linked, both methods now work.

**Session Expiry:** API returns 401 -> try silent refresh token -> if expired: modal "Session expired, please sign in" -> preserve current URL -> after re-auth, return to exact page.

**SSO User Attempts Password Login:** Email entered -> SSO-enforced domain detected -> password field hidden -> "Your organization uses SSO" -> redirect to IdP.

---

## 4. Micro-Interactions

### 4.1 Password Visibility Toggle
Closed-eye/open-eye icon inside the password field, right-aligned. Toggles field between `password` and `text` types. Reverts to hidden on submission. Must have `aria-label` that updates with state. Subtle icon transition (150-200ms ease-in-out).

### 4.2 Password Strength Meter
Four-segment bar: weak (red), fair (orange), good (yellow-green), strong (green). Segments fill with smooth width transition (200-300ms ease-out). Text label states current strength. Complementary checklist with met/unmet indicators. Use `role="meter"` with `aria-valuenow/valuetext`. Color must not be the sole indicator.

**Calculation:** Prioritize length (most important per NIST), breach-list presence, and entropy estimation. Avoid simplistic "must have uppercase" rules.

### 4.3 Loading State During Auth
Disable submit button immediately on click. Replace text with spinner + "Signing in..." (button width stays fixed). If >3 seconds, add reassurance: "Verifying credentials..." Never show a full-page loader — keep the form visible.

### 4.4 Biometric Prompt Animation
Always use system-provided prompts. iOS Face ID: pulsing glow during scan, checkmark + success haptic on pass, horizontal shake + error haptic on fail. Android BiometricPrompt: bottom sheet with pulsing icon, checkmark morph on success, red flash + error message on fail. Never create custom biometric UIs.

### 4.5 Success Redirect
Brief success indicator (green checkmark, 400-600ms) before redirect. For social login returns: "Welcome back, [Name]" with avatar. Smooth page transition (fade/slide). Redirect to the pre-auth deep link, not generic dashboard.

### 4.6 OTP Code Input
Six individual character boxes with auto-advancing focus. Paste fills all boxes simultaneously. Auto-submit after all digits entered (300ms delay for visual confirmation). Each box highlights on focus, briefly scales on input (1.05x, 100ms). Use `aria-label="Digit N of 6"` per box.

---

## 5. Anti-Patterns

### 5.1 Separate Username/Password Pages Without Justification
Breaks password manager autofill and doubles perceived effort. Justified only for SSO routing or passkey detection. **Fix:** Default to single-page login.

### 5.2 Password Rules Displayed Only After Failure
Users create a password, submit, then learn it fails rules. **Fix:** Show requirements upfront as a real-time checklist. Better: follow NIST and eliminate composition rules entirely.

### 5.3 "Remember Me" Defaulting to Off
Most users expect persistence on personal devices. **Fix:** Default ON for consumer apps. OFF only for banking/healthcare/shared devices.

### 5.4 Email Case Sensitivity
Treating "User@Example.com" and "user@example.com" as different accounts. **Fix:** Normalize to lowercase before storage and comparison.

### 5.5 Forced Password Change Without Reason
Periodic rotation leads to weaker passwords (Password1, Password2...). NIST 800-63B-4 explicitly recommends against it. **Fix:** Require changes only on evidence of compromise.

### 5.6 CAPTCHA Before Any Auth Attempt
Adds friction for 100% of users to stop a rare threat. **Fix:** Use invisible bot detection (Cloudflare Turnstile, proof-of-work). Escalate to visible challenge only after suspicious behavior.

### 5.7 Hiding Social Login Options
Placing social buttons behind "More options" or below the fold. **Fix:** Display prominently above email/password, separated by a clear divider.

### 5.8 Blocking Password Paste
Harms security by preventing password manager usage. The UK NCSC explicitly recommends against it. **Fix:** Always allow paste on all input fields.

### 5.9 Clearing Form Fields on Error
Clearing both email and password after failed login. **Fix:** Preserve email, clear only password, focus cursor in password field.

### 5.10 Error Messages That Leak Information
"No account with this email" enables account enumeration. **Fix:** Use generic: "Invalid email or password." For resets: "If an account exists, we've sent a link."

### 5.11 No Loading Feedback on Submit
User clicks "Sign in," nothing changes for 1-3 seconds, clicks again. **Fix:** Immediately disable button, show spinner, debounce submissions.

### 5.12 Requiring Account Creation for One-Time Actions
Forcing sign-up before a purchase or download. **Fix:** Offer guest checkout. Suggest account creation after the action.

### 5.13 Logout Burying
Hiding sign-out deep in menus. **Fix:** Place in user avatar menu or profile dropdown, accessible within 2 interactions from any screen.

---

## 6. Accessibility

### 6.1 Form Label Associations (WCAG 1.3.1, 3.3.2)
Every input needs a visible `<label>` with `for` matching the input's `id`. Never rely on placeholder as the sole label. Group related fields with `<fieldset>` and `<legend>`.

```html
<!-- Correct -->
<label for="email">Email address</label>
<input type="email" id="email" autocomplete="username">

<!-- Incorrect -->
<input type="email" placeholder="Email address">
```

### 6.2 Error Announcements (WCAG 3.3.1, 3.3.3, 4.1.3)
Associate errors with fields via `aria-describedby`. Use `aria-live="polite"` on error containers. Validate on blur or submit — never on every keystroke (disrupts screen readers). On submission failure, move focus to error summary or first invalid field. Errors must be descriptive: "Password must be at least 15 characters" not "Invalid."

```html
<input type="password" id="password" aria-describedby="pw-error" aria-invalid="true">
<div id="pw-error" role="alert" aria-live="polite">
  Password must be at least 15 characters. Currently 8 characters.
</div>
```

### 6.3 Keyboard Navigation (WCAG 2.1.1, 2.4.3)
Entire flow completable via keyboard. Focus order follows visual order. Focus indicators: minimum 2px outline, 3:1 contrast. Modals trap focus and return it on close. Escape closes modals.

### 6.4 CAPTCHA Alternatives (WCAG 3.3.8)
WCAG 2.2 SC 3.3.8 (Level AA): if auth requires a cognitive function test, an alternative must exist.

| Method | Accessibility | Friction | Protection |
|--------|--------------|----------|------------|
| Proof-of-work (Turnstile, Friendly Captcha) | Excellent | None | High |
| Honeypot fields | Good (can false-positive with screen readers) | None | Moderate |
| Rate limiting + behavioral analysis | Excellent | None | Moderate-High |
| Image/Audio CAPTCHA | Poor | High | Moderate |

**Recommendation:** Proof-of-work or behavioral analysis as primary. Never rely on image CAPTCHA alone.

### 6.5 Time Limits (WCAG 2.2.1)
Minimum 10 minutes for OTP codes, 30+ minutes for email links. Warn about limits before starting. For TOTP, accept 3-code window (previous + current + next).

### 6.6 Screen Reader MFA Considerations
OTP boxes: `aria-label="Digit 1 of 6"` through `"Digit 6 of 6"`. QR codes: provide manual entry key as text alternative. Push MFA: provide TOTP/recovery code fallback. Biometric: system prompts are accessible by default.

---

## 7. Cross-Platform Adaptation

### 7.1 iOS
- **Sign in with Apple:** Required when third-party social login offered (Guideline 4.8). Must have equal or greater prominence. Supports "Hide My Email" relay.
- **Face ID / Touch ID:** Use LocalAuthentication framework. Include `NSFaceIDUsageDescription` in Info.plist. Always provide passcode fallback. Prompt opt-in after first password login.
- **Passkeys:** Synced via iCloud Keychain. Use `ASAuthorizationController`. Conditional UI supported in Safari/WKWebView. Cross-device via QR scan.
- **Keychain:** Set `autocomplete` attributes correctly. Support Associated Domains (`webcredentials`) for app/website credential sharing.

### 7.2 Android
- **Google Sign-In:** Use Credential Manager API (replaces legacy SDK). One Tap for returning users. Unified API for passkeys and passwords.
- **Biometric:** Use `BiometricPrompt` (Android 9+), not deprecated `FingerprintManager`. System bottom sheet abstracts sensor type. Set `setAllowedAuthenticators()` for biometric strength. Always include "Use password/PIN" fallback.
- **Passkeys:** Managed via Credential Manager API. Synced via Google Password Manager. Cross-device via Bluetooth proximity + QR. Conditional UI in Chrome/WebView.
- **Autofill:** Use `android:autofillHints` — `AUTOFILL_HINT_USERNAME`, `AUTOFILL_HINT_PASSWORD`, `AUTOFILL_HINT_SMS_OTP`. Works with third-party managers.

### 7.3 Web
- **Passkeys/WebAuthn:** `navigator.credentials.create()`/`.get()`. Conditional UI via `mediation: "conditional"`. Feature-detect: `PublicKeyCredential.isConditionalMediationAvailable`. WebAuthn Level 3 (W3C, January 2025) adds hybrid transport support.
- **Social Login Buttons:** Follow each provider's brand guidelines. Popup-based OAuth for desktop, redirect for mobile web. Handle popup-blocked with redirect fallback.
- **Password Managers:** Use `autocomplete="username"`, `current-password`, `new-password`. Never use `autocomplete="off"`. Use standard `<form>` and `<input>` elements.
- **Sessions:** Secure, HttpOnly, SameSite cookies. Refresh token rotation. Timeout warning modal: "Session expires in 2 min. [Extend] [Sign Out]." Re-auth for sensitive actions even within active sessions.

---

## 8. Decision Tree

### 8.1 Auth Method by App Type

| App Type | Primary Auth | Add-On | MFA Policy | Session Length |
|----------|-------------|--------|------------|---------------|
| Consumer (social, e-commerce) | Social Login + Email/Password | Passkeys, Magic Links | Optional (sensitive actions only) | 30 days |
| B2B SaaS | Email/Password + SSO | Magic Links, Passkeys | Required for admins | 7-14 days idle |
| Enterprise / Internal | SSO (SAML/OIDC) only | Passkeys | Required all users (TOTP/keys) | 4-8 hours absolute |
| Financial / Healthcare | Email/Password + mandatory MFA | Biometric (mobile) | Required (avoid SMS) | 15-30 min idle |
| Developer Platform | Email/Password + Social (GitHub) | Passkeys, Magic Links | Required (TOTP + keys) | 14 days |

### 8.2 When to Require MFA

**Require:** Admin/elevated privileges, financial data, health records/PII, security settings modification, API key access, regulatory mandate (SOC 2, HIPAA, PCI DSS), user-enabled, org policy.

**Recommend (don't require):** Consumer apps with account value, collaborative tools, apps storing sensitive user data, developer platforms.

**Skip:** Anonymous/guest access, low-value accounts, read-only content consumption, trusted devices with biometric re-auth.

### 8.3 Passwordless vs. Traditional

**Favor passwordless when:** Users are in email-heavy workflows, technically savvy, app is used infrequently (passwords forgotten between sessions), mobile-first audience, you want to eliminate password-related support tickets (40-50% of helpdesk volume).

**Favor traditional when:** Low-connectivity environments, users expect it (enterprise norms), offline access needed, user base includes demographics unfamiliar with passwordless.

**Best approach:** Offer both. Default to the highest-completion method for your user base. A/B test. Migrate gradually toward passwordless with upgrade prompts.

### 8.4 Passkey Readiness

Prerequisites: server supports WebAuthn (FIDO2), user base on supported platforms (iOS 16+, Android 9+, Windows 10+), fallback auth method exists, sign-in supports Conditional UI, passkey enrollment UX designed, cross-device flows tested.

All met: implement as upgrade path. Partial: implement for supported platforms with fallback. Mostly unmet: improve existing auth, plan passkey roadmap.

---

## Appendix: Reference Tables

### Autocomplete Attributes
| Context | `autocomplete` Value |
|---------|---------------------|
| Sign in — email/username | `username` |
| Sign in — password | `current-password` |
| Sign up — password | `new-password` |
| MFA — OTP code | `one-time-code` |
| First name | `given-name` |
| Last name | `family-name` |
| Phone (SMS OTP) | `tel` |

### Session Timeouts
| App Type | Idle Timeout | Absolute Timeout |
|----------|-------------|-----------------|
| Banking / Financial | 5-15 min | 4 hours |
| Healthcare (HIPAA) | 15 min | 8 hours |
| Enterprise SaaS | 30 min | 8-12 hours |
| Consumer SaaS | 1-7 days | 30 days |
| Social Media | 30+ days | 90 days |

### Error Message Templates
| Scenario | Bad | Good |
|----------|-----|------|
| Wrong credentials | "Password is incorrect" | "Invalid email or password." |
| Account not found | "No account with this email" | "Invalid email or password." |
| Account locked | "Account locked" | "Too many attempts. Try again in 15 min, or reset your password." |
| Expired link | "Link expired" | "This link has expired. Request a new one below." |
| Weak password | "Too weak" | "Must be at least 15 characters. Try a phrase like 'correct horse battery staple'." |
| MFA code wrong | "Wrong code" | "That code didn't work. Check your authenticator for the latest code." |
| Session expired | (silent redirect) | "Your session has expired. Sign in again to continue." |
| SSO required | "Cannot use password" | "Your organization requires SSO. Click 'Sign in with SSO' to continue." |

### Auth Method Comparison
| Method | Security | Friction | Phishing Resistant | Offline |
|--------|----------|----------|-------------------|---------|
| Password only | Low | Medium | No | Yes |
| Password + SMS OTP | Medium | High | No | No |
| Password + TOTP | High | Medium | No | Yes |
| Password + Push | High | Low | Partial | No |
| Password + Security Key | Very High | Medium | Yes | Yes |
| Magic Link | Medium | Low | Partial | No |
| Passkey | Very High | Very Low | Yes | Yes |
| Biometric (device) | High | Very Low | Yes (local) | Yes |
| SSO (SAML/OIDC) | High | Low | Depends on IdP | No |

---

## References

- **NIST SP 800-63B-4** (August 2025) — [csrc.nist.gov](https://csrc.nist.gov/pubs/sp/800/63/b/4/final)
- **Apple HIG: Sign in with Apple** — [developer.apple.com](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)
- **Apple HIG: Managing Accounts** — [developer.apple.com](https://developer.apple.com/design/human-interface-guidelines/managing-accounts)
- **Material Design 3 Foundations** — [m3.material.io](https://m3.material.io/foundations)
- **WCAG 2.2** — [w3.org](https://www.w3.org/TR/WCAG22/)
- **FIDO Alliance Passkey Design Guidelines** — [passkeycentral.org](https://www.passkeycentral.org/design-guidelines/)
- **Google Passkeys UX** — [developers.google.com](https://developers.google.com/identity/passkeys/ux/user-interface-design)
- **Google Passkeys User Journeys** — [developers.google.com](https://developers.google.com/identity/passkeys/ux/user-journeys)
- **Smashing Magazine: Rethinking Authentication UX** — [smashingmagazine.com](https://www.smashingmagazine.com/2022/08/authentication-ux-design-guidelines/)
- **Smart Interface Design Patterns: 2-Page Login** — [smart-interface-design-patterns.com](https://smart-interface-design-patterns.com/articles/2-page-login-pattern/)
- **Authgear: Login & Signup UX 2025 Guide** — [authgear.com](https://www.authgear.com/post/login-signup-ux-guide)
- **NN/g: Password Creation** — [nngroup.com](https://www.nngroup.com/articles/password-creation/)
- **OWASP Session Management Cheat Sheet** — [cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- **OWASP MFA Cheat Sheet** — [cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- **WorkOS: MFA UX Best Practices** — [workos.com](https://workos.com/blog/ux-best-practices-for-mfa)
- **LogRocket: MFA Design** — [blog.logrocket.com](https://blog.logrocket.com/ux-design/authentication-ui-ux/)
- **LogRocket: Magic Links UX** — [blog.logrocket.com](https://blog.logrocket.com/ux-design/how-to-use-magic-links/)
- **Hanko: Passkey Best Practices** — [hanko.io](https://www.hanko.io/blog/the-dos-and-donts-of-integrating-passkeys)
- **Apple App Store Review Guidelines (4.8)** — [developer.apple.com](https://developer.apple.com/app-store/review/guidelines/)
