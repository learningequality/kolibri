# Build system and workflow

## Frequently asked questions

- **How does the build system work overall?**

    Kolibri uses GitHub Actions with two primary build workflows: **PR builds** for testing and validation, and **release builds** for distribution. PR builds (`pr_build_kolibri.yml`) create artifacts for testing pull requests, while release builds (`release_kolibri.yml`) create final distribution packages when releases are published. Both workflows orchestrate multi-platform builds using external repositories for platform-specific installers.

- **How do I access builds for a PR?**

    The easiest way is through the automated comment that gets posted on each PR. After the build completes, a comment appears with a table of all available artifacts and download links. This comment is automatically updated each time new builds complete. Alternatively, you can access artifacts through the "Checks" section by clicking on the "Kolibri Build Assets for Pull Request" workflow.

- **How do I access builds for tagged releases?**

    Go to the Kolibri GitHub "Releases" page and find your release. Release artifacts are automatically attached as downloadable assets on the release page itself. Each release will have Python packages (WHL/PEX), macOS app (DMG), Linux package (DEB), Windows installer (EXE), Android app (APK), and Raspberry Pi image (ZIP) files available for download.

## Build types and triggers

**Release Types**:
- **Final releases** (e.g., v1.0.0): Production releases that go through manual approval and are published to PyPI and Google Play Store
- **Prereleases** (e.g., v1.0.0-beta1): Testing releases that skip manual approval and are not published to final distribution channels

Kolibri has two distinct build workflows:

### PR builds (`pr_build_kolibri.yml`)
- Triggered automatically on every pull request
- Creates test artifacts for validation (see "PR artifacts" section below)

### Release builds (`release_kolibri.yml`)
- Triggered when a GitHub release is published
- Creates production packages with code signing (see "Release artifacts" section below)

## Repository structure

### Main repository: `learningequality/kolibri`
- Core application code and build orchestration
- Workflow definitions in `.github/workflows/`
- Produces foundational Python packages (WHL, TAR, PEX)

### Platform installer repositories:
Each external repository specializes in one platform:

- **kolibri-app**: macOS .dmg with app signing and notarization
- **kolibri-installer-debian**: .deb packages for Debian/Ubuntu
- **kolibri-installer-windows**: .exe with Windows code signing
- **kolibri-installer-android**: .apk with Google Play Store publishing

## Workflow orchestration

Both PR and release workflows follow a similar orchestration pattern but with different end goals:

### Common build sequence:
1. **Python Package Build**: Creates WHL (Python wheel - a built package format) and TAR (source archive) files using `build_whl.yml`
2. **PEX Build**: Creates a PEX (Python EXecutable - a self-contained Python application) using the WHL
3. **Platform Builds**: Triggers platform-specific build workflows:
   - **DMG** (macOS disk image): `learningequality/kolibri-app`
   - **DEB** (Debian/Ubuntu package): `learningequality/kolibri-installer-debian`
   - **EXE** (Windows installer): `learningequality/kolibri-installer-windows`
   - **APK** (Android app package): `learningequality/kolibri-installer-android`
   - **ZIP** (Raspberry Pi disk image): built locally from `platforms/raspberry-pi/` via `platform-pi-build_img.yml`

### How external workflows are called

Platform-specific builds use the `uses` keyword to call workflows in external repositories:

```yaml
dmg:
  uses: learningequality/kolibri-app/.github/workflows/build_mac.yml@v0.4.4
  with:
    whl-file-name: ${{ needs.whl.outputs.whl-file-name }}
    ref: v0.4.4
```

Key aspects:
- **Specialized tooling**: Each platform repository contains platform-specific build tools
- **Version pinning**: External workflows are pinned to specific versions (e.g., `@v0.4.4`) for stability
- **Ref parameter**: Ensures external workflows use the correct version of their own code (required due to GitHub Actions limitations)
- **Parallel execution**: All platform builds run simultaneously
- **Artifact passing**: Python packages are passed between workflows

### PR artifacts

- Artifacts stored in GitHub Actions for temporary access
- Automated PR comments with download links
- No code signing or publishing steps
- Focus on validation and testing

1. Developer creates/updates PR
2. `pr_build_kolibri.yml` triggers automatically
3. Artifacts generated and stored in GitHub Actions
4. `pr_build_comment.yml` posts/updates a comment with download links
5. Reviewers and testers download artifacts for validation
6. Artifacts expire after GitHub's retention period

### Release artifacts

- Include code signing for production distribution
- **Automatic steps**: Build all artifacts, upload to GitHub release assets, upload to Google Cloud Storage, and upload to TestPyPI
- **Manual approval required** (final releases only): PyPI publishing and Google Play Store publishing require manual approval through GitHub's environment protection
- **Prerelease behavior**: Prereleases skip the manual approval and do not publish to PyPI or Google Play Store
- Artifacts attached to GitHub releases

1. Maintainer publishes GitHub release
2. `release_kolibri.yml` triggers automatically
3. **Automatic steps** (all releases):
   - Production builds with code signing
   - Upload artifacts to GitHub release page
   - Upload to Google Cloud Storage
   - Upload to TestPyPI (test instance of Python Package Index for validation)
4. **Manual approval step** (final releases only):
   - A maintainer must manually approve the release through GitHub's web interface
   - The workflow pauses and waits for approval before proceeding
   - Prereleases skip this step entirely
5. **After approval** (final releases only):
   - Upload to PyPI (Python packages)
   - Publish to Google Play Store (Android APK)
6. Permanent public availability
