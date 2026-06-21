# Deploying a Customized Kolibri App to a School

This is a **live engineering runbook** for packaging our custom fork of Kolibri and deploying it at a school site. The fork includes customized features and gates enabled and ready.

> **Scope of this revision:** Packaging, installation, network setup, content importing, and initial tablet provisioning to view content. Facility account administration (classrooms, teacher logs) and attendance workflows can wait.

> **Audience:** Engineering and IT deployment teams. Assumes familiarity with git, Docker, the Kolibri codebase, and standard networking concepts.

---

## Topology

```
[Windows PC Server]             Full-facility server (custom build)
   Kolibri EXE                  Runs locally, serving app on port 8080
   port 8080                    and static zip content on port 8081.
   port 8081                    Assigned a static IP address on the school LAN.
         │
         │  Morango sync & content pull over local Wi-Fi LAN
         │  (mDNS auto-discovery/zeroconf handles connection)
         ▼
 ┌───────┴──────────────┐
 │                      │
[Tablet 1]             [Tablet 2]             [Tablet N]
 Android APK            Android APK            Android APK
 (custom client)        (custom client)        (custom client)
 Learner A              Learner B              Learner C
```

**Key Concept:** Each student tablet runs Kolibri locally as a **Learn-Only Device (LOD)** / **Subset of Users Device (SoUD)**. It connects to the Windows PC Server over the local network to pull down assigned lessons and channels.

---

## Prerequisites & assumptions

| Item                     | Value / placeholder |
| ------------------------ | ------------------- |
| Fork URL                 | `<FORK_URL>` (e.g., `github.com/org/kolibri`) |
| Default branch           | `<FORK_BRANCH>` (e.g., `main` or `school-release`) |
| Build machine            | Linux or WSL2 with Docker |
| School server hardware   | Windows PC (target of the EXE installer) |
| Learner devices          | Android tablets (target of the custom APK) |
| Content source           | Kolibri Studio (`studio.learningequality.org`) |

Confirm before starting:
* [ ] Fork is checked out and on `<FORK_BRANCH>` at the desired commit.
* [ ] Build machine runs Docker.
* [ ] School server PC and all tablets share a single LAN with no AP client isolation.

---

## Section A: Packaging the Custom App (Developer Steps)

### Phase 1 — Build the Python wheel + source tarball

**Goal:** Produce `kolibri-<VERSION>-py3-none-any.whl` and `kolibri-<VERSION>.tar.gz` which contain all code, precompiled static dependencies, and assets.

1. Check out the desired release tag/branch on the build machine.
2. Bump the version so the custom build is distinguishable from upstream. Set the `VERSION` tuple in [kolibri/__init__.py](file:///C:/repos/kolibri/kolibri/__init__.py) and create the `kolibri/VERSION` file:
   ```bash
   make writeversion
   ```
3. Run the build inside `python:3.6-buster` to guarantee compatibility. We install Node 18 from NodeSource to ensure `pnpm` runs correctly:
   ```bash
   docker run --rm -v "$PWD:/kolibri" -w /kolibri python:3.6-buster bash -lc '
     apt-get update && apt-get install -y curl git
     curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
     apt-get install -y nodejs
     curl -fsSL https://pnpm.io/install.sh | env PNPM_VERSION=8.15.0 sh -
     export PATH="$HOME/.local/share/pnpm:$PATH"
     pip install -r requirements/build.txt
     pnpm install
     make dist
   '
   ```
4. Collect the output files inside `dist/`:
   * `kolibri-<VERSION>-py3-none-any.whl`
   * `kolibri-<VERSION>.tar.gz`

---

### Phase 2 — Build the Windows EXE (school server installer)

**Goal:** Produce `Kolibri-<VERSION>-windows.exe` from the Python source tarball.

1. Clone the Windows installer repository:
   ```bash
   git clone https://github.com/learningequality/kolibri-installer-windows
   cd kolibri-installer-windows
   ```
2. Trigger the GitHub Actions build workflow (or run locally using Inno Setup on a Windows host), feeding it our custom `kolibri-<VERSION>.tar.gz`.
3. Collect the generated `Kolibri-<VERSION>-windows.exe`.

---

### Phase 3 — Build the Android APK (WebView client)

**Goal:** Produce `kolibri-<VERSION>.apk` to wrap Kolibri in a secure local WebView and enable camera hardware permissions.

1. Clone the Android installer repository:
   ```bash
   git clone https://github.com/learningequality/kolibri-installer-android
   cd kolibri-installer-android
   ```
2. Apply the following custom changes:
   * **Declare camera permission and optional camera hardware** in `AndroidManifest.xml`:
     ```xml
     <uses-permission android:name="android.permission.CAMERA"/>
     <uses-feature android:name="android.hardware.camera" android:required="false"/>
     ```
   * **Override WebView permissions** in the custom `WebChromeClient` implementation to grant video capture:
     ```java
     @Override
     public void onPermissionRequest(PermissionRequest request) {
         for (String resource : request.getResources()) {
             if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                 request.grant(new String[]{ PermissionRequest.RESOURCE_VIDEO_CAPTURE });
                 return;
             }
         }
         request.deny();
     }
     ```
3. Build the APK using the repository build pipeline (requires Android SDK/NDK) and collect the finished `kolibri-<VERSION>.apk`.

---

## Section B: School-Site Installation & Initial Setup

### Phase 4 — School Network Setup

**Goal:** Establish a stable local area network (LAN) so client tablets can connect to the Windows server PC reliably.

1. **Configure a Static IP Address** on the school Windows server PC (or set a DHCP reservation on the school's router). This prevents the server IP address from changing on reboot.
2. **Open Firewall Ports:** In Windows Defender Firewall, allow inbound TCP traffic on:
   * `8080` (HTTP — Kolibri main app port)
   * `8081` (sandboxed channel zip content port)
3. Connect the server PC and student tablets to the same Wi-Fi router. Ensure **AP client isolation** is disabled in the router settings.

---

### Phase 5 — Install & provision the Windows server

**Goal:** Set up a running, provisioned Kolibri instance on the school's Windows PC.

1. Copy `Kolibri-<VERSION>-windows.exe` to the server PC and run it.
2. **Configure Data Location (Optional but Recommended):** By default, Kolibri writes data to `C:\Users\<Windows-User>\.kolibri`. To store databases and content channels on a dedicated data partition (e.g. `D:\kolibri_data`), set a system-wide environment variable named `KOLIBRI_HOME` pointing to that path before starting the app.
3. Open `http://localhost:8080` in the server PC's web browser and complete the Setup Wizard:
   * **Device type:** Full device
   * **Facility preset:** Formal (school)
   * **Admin account:** Create the primary admin credentials.
4. Verify that the server starts and runs without errors.

---

### Phase 6 — Import content from Kolibri Studio

**Goal:** Load learning channels onto the server so they are ready to be distributed to student tablets.

1. Temporarily connect the Windows server PC to the internet (or use an external storage drive containing pre-downloaded content).
2. Sign in as admin, navigate to **Device > Channels**, and click **Import**.
3. Select **Kolibri Studio** (online option) or choose your local storage drive.
4. Input the channel token (e.g., `nakav-mafak` for the dev QA channel) or select the desired channels from the directory.
5. Wait for the download and import tasks to finish.
6. Verify under **Learn > Channels** that the imported channels are visible and content (videos, PDFs, exercises) loads correctly.

---

### Phase 7 — Sideload APK & provision student tablets

**Goal:** Sideload the custom APK on tablets and link them as Learn-Only Devices (LODs) that auto-sync with the Windows server.

For each tablet:
1. Sideload `kolibri-<VERSION>.apk` onto the device.
2. Connect the tablet to the school's Wi-Fi network.
3. Launch the Kolibri app. In the initial Setup Wizard, select **"Learn-only device"** (LOD).
4. The tablet will search the local network via mDNS and list nearby Kolibri servers. Select the school's Windows PC Server from the list, then select your facility.
5. **Import/Join:** Choose **IMPORT** to link the tablet to a learner account.
   * *Note:* If the student doesn't have a password or you want to bypass manual typing, click **"Use admin or coach account"** and enter the teacher's/admin's credentials to authenticate the import.
6. The tablet will trigger a single-user Morango pull sync to fetch the student's record and configurations.
7. Once synced, the tablet is provisioned. The server will automatically sync down assigned channels and lesson resources whenever the tablet is connected to the LAN.

---

## Section C: Post-Setup Verification

Verify the following before declaring the setup complete:

- [ ] **LAN Reachability:** Open a browser on a phone or laptop connected to the school Wi-Fi and navigate to `http://<server-ip>:8080`. Confirm the login screen loads.
- [ ] **Tablet Content Playback:** Open the Kolibri app on a provisioned student tablet, navigate to the **Learn** tab, open a channel, and play a video or load a document. Confirm it works offline.
- [ ] **Sync Status:** On the server, navigate to **Device > Tasks** and verify that sync connections from the tablets are registered and completing successfully.

---

## Section D: Maintenance & Basic Troubleshooting

### Data Backups
Schedule regular backup copies of the entire `KOLIBRI_HOME` directory on the Windows PC Server. This directory contains the SQLite databases (`db.sqlite3`), content channels, and sync records. It is the sole source of truth for the facility.

### Troubleshooting Network & Setup Issues

| Symptom | Likely Cause | Resolution |
| ------- | ------------ | ---------- |
| Tablet cannot discover the server PC | mDNS traffic blocked, or firewall blocking discovery. | 1. Ensure both devices are on the same Wi-Fi subnet.<br>2. Confirm **AP Client Isolation** is disabled on the router.<br>3. Allow inbound UDP traffic on port `5353` (mDNS) and TCP on `8080`/`8081` in the Windows Server Firewall. |
| Content files (videos, zip files) fail to load on tablets | Content server blocked or port 8081 closed. | Ensure Windows Firewall allows inbound TCP traffic on port `8081` (`ZIP_CONTENT_PORT`), which serves static HTML5/ZIP content. |
| Python wheel build fails inside Docker | Node.js version conflict or missing dependencies. | Ensure the Docker command updates repositories and installs Node 18 from NodeSource (`setup_18.x`) before running `pnpm install`. |
