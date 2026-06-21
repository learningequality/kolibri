# QR Code Login — Implementation Summary

This document describes all changes made to add QR code sign-in for learners
in Kolibri, the current state of the feature, and what work remains.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Backend Changes](#backend-changes)
- [Frontend Changes](#frontend-changes)
- [Infrastructure Changes](#infrastructure-changes)
- [How QR Codes Are Assigned](#how-qr-codes-are-assigned)
- [End-to-End Sign-in Flow](#end-to-end-sign-in-flow)
- [Remaining Work](#remaining-work)
- [Known Limitations](#known-limitations)

---

## Overview

QR code login is a fourth sign-in method for Kolibri learners (alongside
username+password, username-only, and picture password). Each learner is
assigned a unique 256-bit random bearer token; the token is encoded into a
QR code printed on a credential card. Learners sign in by scanning or
uploading a photo of their QR code.

**Branch:** `feature/qr-login` (11 commits on top of `v0.19.4`)

**Scope delivered:** backend auth + API, sign-in page with camera scanner
and file-upload fallback, facility toggle, profile display, printable QR
cards, Python tests (42), Jest tests (14), operator docs.

---

## Architecture

```
                          ┌─────────────────────┐
                          │  Facility Settings   │
                          │  ☑ Enable QR login   │
                          └──────────┬──────────┘
                                     │ PATCH
                                     ▼
            ┌────────────────────────────────────────────┐
            │  save_facility_login_settings endpoint      │
            │  → enqueues assign_qr_login_tokens_to_facility │
            └────────────────────┬───────────────────────┘
                                 │ bulk task
                                 ▼
            ┌────────────────────────────────────────────┐
            │  assign_qr_login_tokens_to_facility         │
            │  → assign_qr_login_token(learner) for each  │
            │  → secrets.token_urlsafe(32) per learner    │
            └────────────────────┬───────────────────────┘
                                 │ stores
                                 ▼
            ┌────────────────────────────────────────────┐
            │  FacilityUser.qr_login_token                │
            │  (CharField, max_length=64, globally unique)│
            └────────────────────┬───────────────────────┘
                                 │ read by
                   ┌─────────────┼──────────────┐
                   ▼             ▼              ▼
             ┌──────────┐ ┌───────────┐ ┌────────────┐
             │ Sign-in  │ │ Profile   │ │ Print cards│
             │ scanner  │ │ QR display│ │ (All Pwd)  │
             └────┬─────┘ └───────────┘ └────────────┘
                  │ POST /api/auth/session/
                  ▼
            ┌────────────────────────────────────────────┐
            │  CreateSessionSerializer                    │
            │  → authenticate(qr_login_token=..., facility=...)│
            │  → QRTokenAuthScope.matches_credentials()   │
            │  → prevalidate returns {full_name}          │
            │  → confirm creates real session             │
            └────────────────────────────────────────────┘
```

---

## Backend Changes

### Model (`kolibri/core/auth/models.py`)

| Change | Location |
|--------|----------|
| New field `qr_login_token` on `FacilityUser` | `models.py:958` — `CharField(max_length=64, null=True, unique=True)` |
| New field `enable_qr_login` on `FacilityDataset` | `models.py:234` — `BooleanField(default=False)` |
| `Role.save()` clears `qr_login_token` when a role is added | `models.py:1604-1607` |
| `Role.delete()` reassigns token when user loses last role | `models.py:1633-1640` |

The token is stored as **plaintext** (like `picture_password`) so coaches can
read it back when reprinting cards. It is a bearer token — anyone with the QR
image can sign in until the token is rotated.

### Migration

`kolibri/core/auth/migrations/0036_facilityuser_qr_login_token.py` — adds both
fields in a single migration. Dependencies: `0035_facilitydataset_picture_password_settings`.

### Token Utility (`kolibri/core/auth/utils/qr_tokens.py`)

New module providing:

| Function | Purpose |
|----------|---------|
| `generate_qr_login_token()` | Returns `secrets.token_urlsafe(32)` (~43 chars, 256 bits) |
| `assign_qr_login_token(user)` | Assigns if eligible (learner, no roles, not superuser); no-op otherwise; retries on `IntegrityError` |
| `reassign_qr_login_token(user)` | Replaces existing token (rotation); clears for ineligible users |
| `clear_qr_login_token(user)` | Nulls the field (used by `Role.save()`) |

### Auth Backend (`kolibri/core/auth/backends.py`)

New `QRTokenAuthScope(FacilityAuthScope)` at `backends.py:197`:
- `get_queryset()` — filters by both `dataset_id` (defense-in-depth) and `qr_login_token`
- `matches_credentials(user)` — verifies `dataset.enable_qr_login=True`, user has no roles, and user is not a superuser (or is on a full-facility-import device)

`FacilityUserBackend.authenticate()` at `backends.py:231` dispatches to
`QRTokenAuthScope` when the `qr_login_token` kwarg is present. A failed QR
attempt **never falls through** to username/password auth.

### Session Serializer (`kolibri/core/auth/api.py`)

`CreateSessionSerializer` at `api.py:1290`:
- New field `qr_login_token` (`CharField`, min_length=16, max_length=64)
- New validate branch calls `authenticate(qr_login_token=..., facility=...)` — isolated from username/password path
- `_throw_validation_error` raises `NOT_FOUND` with `field='qr_login_token'` on failure

### Serializers (`kolibri/core/auth/serializers.py`)

- `FacilityUserSerializer`: `qr_login_token` added to `fields` and `read_only_fields`; `create()` auto-assigns a token when `facility.dataset.enable_qr_login=True`
- `FacilityDatasetSerializer`: `enable_qr_login` added to `fields`
- `PublicFacilitySerializer`: `enable_qr_login` exposed via `SerializerMethodField` so sign-in pages can detect the feature before authentication

### Facility Settings Endpoint (`kolibri/core/auth/api.py`)

`FacilityDatasetViewSet.save_facility_login_settings` at `api.py:298`:
- When `enable_qr_login` flips False→True: sets flag, enqueues `assign_qr_login_tokens_to_facility` task, returns 202 with task info
- When flipping True→False: clears flag (tokens remain in DB for re-enable)

### Background Task (`kolibri/core/auth/tasks.py`)

`assign_qr_login_tokens_to_facility` at `tasks.py:855`:
- Registered task with `AssignQRLoginTokensValidator`, `permission_classes=[IsAdminForJob]`
- Iterates all role-less, non-superuser learners missing a token
- Calls `assign_qr_login_token(learner)` for each
- No exhaustion concern (256-bit keyspace)

### Sync (`kolibri/core/auth/kolibri_plugin.py`)

New `QRLoginSyncHook` at `kolibri_plugin.py:160`:
- After a facility-data sync receive, assigns tokens to any newly-arrived learners missing one
- No collision operation registered (256-bit keyspace makes collisions astronomically unlikely)

### Role Viewset (`kolibri/core/auth/api.py`)

`RoleViewSet.perform_create()` at `api.py:936` clears `qr_login_token` (alongside `picture_password`) when roles are bulk-created.

### Facility List API

`dataset_keys` list at `api.py:950` includes `dataset__enable_qr_login` so the unauthenticated facility-list endpoint exposes the flag.

---

## Frontend Changes

### Constants & Composables

| File | Change |
|------|--------|
| `packages/kolibri-common/constants/Auth.js` | Added `QR_LOGIN: 'qr_login'` to `OptionsForSignIn` |
| `packages/kolibri-common/composables/useFacility.js` | Added `isQrLoginFeatureEnabled` (English-only gate); pushes `QR_LOGIN` into `signInOptions` when `facilityConfig.enable_qr_login` is true |
| `kolibri/plugins/user_auth/frontend/constants.js` | Added `QR_SIGN_IN: 'QRSignInPage'` to `ComponentMap`; mapped in `SignInOptionToComponentMap` |
| `kolibri/plugins/user_auth/frontend/composables/useAuthRouter.js` | Added `qrSignInRoute` computed |
| `kolibri/plugins/user_auth/frontend/routes.js` | Added `/qr-signin` route guarded by `signInHook(OptionsForSignIn.QR_LOGIN, ...)` |

### Sign-in Components

| File | Purpose |
|------|---------|
| `SignInPage/QRSignInPage.vue` | Main sign-in page: wraps `AuthBase`, renders `QRScanner`, manages prevalidate → confirm → commit flow |
| `SignInPage/QRSignIn/QRScanner.vue` | Camera scanner with 3 fallback paths: native `BarcodeDetector` → `@zxing/browser` polyfill → file-upload |
| `SignInPage/QRSignIn/QRSignInConfirmModal.vue` | "Is this you?" full-screen overlay shown after successful prevalidate |

The scanner handles non-HTTPS contexts (common for Kolibri LAN deployments)
by skipping the camera pane entirely and showing only the file-upload fallback.

### AuthBase Link (`kolibri/plugins/user_auth/frontend/views/AuthBase.vue`)

Added `showQRSignInOption` computed and a second `<KRouterLink>` ("Sign in
with a QR code") that appears alongside the existing picture/username toggle
when QR login is enabled and not the current method.

### Facility Config (`kolibri/plugins/facility/frontend/views/FacilityConfigPage/index.vue`)

Added `KCheckbox` for `enable_qr_login` (gated on `isQrLoginFeatureEnabled`).
`useFacilityEditor.js` threads `enable_qr_login` through `LOGIN_SETTINGS_FIELDS`
and exposes `qrLoginTaskId` for future progress UI.

### Profile Display (`kolibri/plugins/user_profile/frontend/views/ProfilePage/index.vue`)

Added `showQrLoginRow` computed and a "My QR code" table row rendering
`UserQRCode` (120px) when the signed-in learner has a token.

### QR Code Rendering

| File | Purpose |
|------|---------|
| `packages/kolibri-common/components/UserQRCode.vue` | Renders a QR code `<img>` from a token string using the existing `qrcode` npm library |
| `packages/kolibri-common/components/LearnerQRCard.vue` | Printable card: photo placeholder + learner name + QR code |
| `packages/kolibri-common/components/AllPasswordsPage.vue` | Extended with "Print QR codes" radio option; renders `LearnerQRCard` when `printFormat === 'qr'` |

### i18n Strings (`packages/kolibri-common/strings/qrLoginStrings.js`)

New translator with 24 string keys covering scanner status, error states,
confirm modal, facility config label, profile label, and print format.

---

## Infrastructure Changes

### Dependencies

| Package | Location | Purpose |
|---------|----------|---------|
| `@zxing/browser` | root + `packages/kolibri` + `packages/kolibri-common` | QR code decoding (camera + file upload) |
| `@zxing/library` | root + `packages/kolibri` + `packages/kolibri-common` | Peer dependency of `@zxing/browser` |
| `sass` (Dart Sass) | root devDependencies | SCSS compilation fallback for ARM64 (where `node-sass` has no binary) |

### Sass Patch (`patches/sass@1.69.0.patch`)

A `pnpm patch` that wraps Dart Sass's `compileString`/`compileStringAsync`/
`compile`/`compileAsync` methods to replace `/deep/` selectors with `::v-deep`
before compilation. This allows the build to succeed without `node-sass` on
platforms where no prebuilt binary exists (e.g. `win32-arm64-node22`).

### EpubStyles Fix (`kolibri/plugins/epub_viewer/frontend/views/EpubStyles.scss`)

Replaced 2 `/deep/` selectors with `::v-deep` (pre-existing Dart Sass
incompatibility that was only surfaced because the ARM64 machine can't use
`node-sass`).

### Dev Scripts

| File | Purpose |
|------|---------|
| `start-kolibri.ps1` | Full startup: venv → deps → migrations → facility provisioning → server (dev/prod/backend modes) |
| `dev-qr-start.ps1` | Lightweight startup (backend API only) |
| `dev-qr-stop.ps1` | Shutdown + cleanup |
| `dev_setup_qr.py` | Idempotent provisioning helper (facility + QR login + 3 test learners) |

---

## How QR Codes Are Assigned

### When the admin enables QR login

1. Admin signs in → **Facility > Settings**
2. Checks **"Allow learners to sign in with a QR code"**
3. Clicks **Save**
4. The `save_facility_login_settings` endpoint:
   - Sets `FacilityDataset.enable_qr_login = True`
   - Enqueues the `assign_qr_login_tokens_to_facility` background task
5. The task iterates all eligible learners (role-less, non-superuser) and
   calls `assign_qr_login_token()` for each, generating a unique 256-bit
   token via `secrets.token_urlsafe(32)`

### When a new learner is created (after QR login is enabled)

1. Admin or coach creates a new user via **Facility > Users > Create user**
2. `FacilityUserSerializer.create()` checks `facility.dataset.enable_qr_login`
3. If True, calls `assign_qr_login_token(instance)` automatically
4. The learner's QR code is available immediately

### When learners arrive via sync

1. After a facility-data sync receive, `QRLoginSyncHook.post_transfer()` runs
2. It finds all learners in the dataset missing a token
3. Assigns tokens to each

### Printing QR cards

1. Admin/coach navigates to the **All Passwords** page
   (Facility > Class > Passwords, or Coach > Class > Passwords)
2. Clicks **Print**
3. Selects **"Print QR codes"** in the format dialog
4. Each card shows: photo placeholder box, learner name + username, QR code

---

## End-to-End Sign-in Flow

```
Learner arrives at sign-in page
        │
        ▼
Clicks "Sign in with a QR code"
        │
        ▼
QRSignInPage renders QRScanner
        │
        ├─ HTTPS context: camera opens, live scanning
        │
        └─ HTTP context: file-upload fallback only
                │
                ▼
        Learner uploads/takes photo of QR card
                │
                ▼
        Scanner decodes QR → emits 'decoded' event with token
                │
                ▼
        QRSignInPage.prevalidate(token)
        │  POST /api/auth/session/?prevalidate=true
        │  body: { qr_login_token: token, facility: facilityId }
        │
        ├─ Success: returns { full_name: "Maria López" }
        │          │
        │          ▼
        │   QRSignInConfirmModal: "Is this you? Maria López"
        │          │
        │          ├─ ✓ Confirm:
        │          │   POST /api/auth/session/ (no prevalidate)
        │          │   → session created → redirect to learner home
        │          │
        │          └─ ✗ Cancel: modal closes, scanner restarts
        │
        └─ Failure: HTTP 400 NOT_FOUND
                   │
                   ▼
              "That QR code was not recognized" error alert
              Scanner restarts for retry
```

---

## Remaining Work

The following items are **not yet implemented** and would be needed before a
production release. They are grouped by priority.

### P0 — Must-have for production

#### 1. Token rotation / regeneration UI

**Problem:** If a learner's QR card is lost or stolen, there is no way for an
admin to revoke and reissue the token from the UI. The backend function
`reassign_qr_login_token()` exists but has no caller.

**What's needed:**
- A `@action(detail=True, methods=["post"]) rotate_qr_token` on
  `FacilityUserViewSet` (admin-only permission)
- A "Regenerate QR code" button in the user create/edit side panel
  (`facility/frontend/views/users/sidePanels/UserCreate/index.vue`)
- Optionally in the coach's learner detail view

#### 2. Rate limiting on the session endpoint

**Problem:** `SessionViewSet` has no throttle classes. While the 256-bit
keyspace makes brute-force infeasible, rate limiting is a defense-in-depth
best practice and protects against token-enumeration attacks on the
prevalidate endpoint (which returns `full_name` without creating a session).

**What's needed:**
- Add DRF `throttle_classes` to `SessionViewSet` (e.g. 10 attempts/minute per IP)
- Or apply a global DRF throttle in settings

#### 3. Bulk task progress UI

**Problem:** When the admin enables QR login, the `assign_qr_login_tokens_to_facility`
task runs in the background. The `qrLoginTaskId` ref is plumbed through
`useFacilityEditor.js` but is never consumed in the `FacilityConfigPage`
template — the admin gets no progress indicator or completion notification.

**What's needed:**
- Add `qrLoginTask` computed and `watch(qrLoginTask, ...)` in
  `FacilityConfigPage/index.vue`, mirroring the existing `pictureLoginTask` pattern
- Show a loading spinner on the save button while the task runs
- Fire a success/failure snackbar on completion

### P1 — Should-have before wider rollout

#### 4. QR login info modal

**Problem:** The facility config checkbox for QR login has no info icon or
help modal, unlike picture password which has `PicturePasswordInfoModal`.

**What's needed:**
- Create `FacilityConfigPage/QrLoginInfoModal.vue` explaining what QR login
  is, how cards work, and the security implications
- Add an info `KIconButton` next to the checkbox

#### 5. Coach learner-detail QR view

**Problem:** A coach cannot view or reprint an individual learner's QR code
from the coach plugin. They must navigate to the class-wide "All Passwords"
page and print all cards.

**What's needed:**
- Add a QR code display section to `LearnerSummaryPage/index.vue` (or a
  printable card action in the learner detail)

#### 6. i18n — remove the English-only gate

**Problem:** The feature is currently gated behind `isQrLoginFeatureEnabled`
which checks `currentLanguage === 'en'`. All 24 strings in
`qrLoginStrings.js` need translation before the gate can be removed.

**What's needed:**
- Run the Kolibri i18n extraction pipeline (`pnpm makemessages`)
- Submit strings to Crowdin for community translation
- Remove the `_isEnglish` check in `useFacility.js`

### P2 — Nice-to-have / deferred

#### 7. Attendance scanning (v2 scope)

**Problem:** The original feature request included QR scanning for attendance.
This was deferred to v2. The attendance app (`kolibri/core/attendance/`)
already exists with `AttendanceSession`/`AttendanceRecord` models and a
`bulk_update` API.

**What's needed:**
- Add a "Scan" button to `AttendanceNewPage.vue` / `AttendanceFormTable.vue`
- Decode the learner's QR token → resolve to user → mark present via
  `bulk_update`
- Low marginal effort since the attendance API is already built

#### 8. Android app support

**Problem:** The Kolibri Android app wraps Kolibri in a WebView. Live camera
scanning needs the wrapper to grant camera permission. The file-upload
fallback works without changes.

**What's needed (cross-repo PR to `kolibri-installer-android`):**
- Add `<uses-permission android:name="android.permission.CAMERA"/>` to `AndroidManifest.xml`
- Override `WebChromeClient.onPermissionRequest()` to grant `RESOURCE_VIDEO_CAPTURE`
- Add runtime permission prompt in the host activity

#### 9. Single-learner card printing

**Problem:** The "Print QR codes" flow prints cards for ALL learners in a
class. There's no way to print a single learner's card (e.g. a replacement
for a lost one).

**What's needed:**
- Add a "Print QR card" action on the learner detail or edit views
- Render a single `LearnerQRCard` in a print-only view

#### 10. QR login disable per-learner

**Problem:** QR login is all-or-nothing per facility. An admin can't disable
QR for a specific learner while keeping it enabled for others.

**What's needed:**
- Clearing a learner's `qr_login_token` effectively disables QR for them
  (the token won't match), but there's no UI for this
- Could add a "Disable QR login for this learner" toggle in the user edit panel

---

## Known Limitations

### Camera requires HTTPS

Browsers only allow `getUserMedia` in a secure context (HTTPS or `localhost`).
Kolibri is frequently deployed over plain HTTP on a LAN. On such deployments,
the QR sign-in page automatically falls back to the **file-upload** path —
the learner (or coach) takes or selects a photo of the QR code, and the
`@zxing/browser` library decodes the image client-side.

### ARM64 Windows build

On ARM64 Windows (e.g. Snapdragon X devices), `node-sass` has no prebuilt
binary for Node 22. The build uses Dart Sass with a pnpm patch
(`patches/sass@1.69.0.patch`) that replaces `/deep/` selectors with
`::v-deep` before compilation. This is a build-time concern only; the runtime
behavior is identical.

### Token is a bearer credential

The QR code encodes the raw 256-bit token. Anyone who photographs the QR
image can sign in as that learner until the token is rotated. This is the
same threat model as the existing picture-password feature but with a much
larger keyspace (256 bits vs ~10 bits). The feature is designed for
shared-device classroom use, not high-stakes assessments.

### No cross-facility login

The `QRTokenAuthScope` filters by both `qr_login_token` and `dataset_id`.
A learner's QR code will not authenticate on a different facility's device.
This is intentional security behavior.
