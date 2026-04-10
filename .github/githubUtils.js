const fs = require('fs');
const path = require('path');


const file_manifest = {
  "apk": {
    "extension": "apk",
    "description": "Android Package (APK)",
    "content_type": "application/vnd.android.package-archive",
  },
  "deb": {
    "extension": "deb",
    "description": "Debian Package",
    "content_type": "application/vnd.debian.binary-package",
  },
  "dmg": {
      "extension": "dmg",
      "description": "Mac Installer (DMG)",
      "content_type": "application/x-apple-diskimage",
  },
  "exe": {
      "extension": "exe",
      "description": "Windows Installer (EXE)",
      "content_type": "application/x-ms-dos-executable",
  },
  "pex": {
      "extension": "pex",
      "description": "PEX file",
      "content_type": "application/octet-stream",
  },
  "whl": {
      "extension": "whl",
      "description": "WHL file",
      "content_type": "application/zip",
  },
  "gz": {
      "extension": "gz",
      "description": "TAR file",
      "content_type": "application/gzip",
  },
  "zip": {
      "extension": "zip",
      "description": "Raspberry Pi Image",
      "content_type": "application/x-zip-compressed",
  },
}

const file_order = [
  "whl",
  "pex",
  "exe",
  "deb",
  "dmg",
  "apk",
  "zip",
  "gz",
]


const buildArtifactsHeader = '**Build Artifacts**';

async function generateAssetComment(github, context) {
  const opts = github.rest.actions.listWorkflowRunArtifacts.endpoint.merge({
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: context.payload.workflow_run.id,
  })
  const artifacts = await github.paginate(opts)
  const matchArtifact = artifacts.filter((artifact) => {
    return artifact.name == "pr_number"
  })[0];
  const download = await github.rest.actions.downloadArtifact({
    owner: context.repo.owner,
    repo: context.repo.repo,
    artifact_id: matchArtifact.id,
    archive_format: 'zip',
  });
  fs.writeFileSync(`${process.env.GITHUB_WORKSPACE}/pr_number.zip`, Buffer.from(download.data));

  let text = `### [${buildArtifactsHeader}](${context.payload.workflow_run.html_url})`

  const checkSuiteNumber = context.payload.workflow_run.check_suite_id
  const repoHtmlUrl = context.payload.repository.html_url

  const artifactsToDisplay = artifacts.filter((artifact) => {
    return !artifact.expired && file_manifest[artifact.name.split('.').pop()]
  })

  artifactsToDisplay.sort((a, b) => {
    const a_order = file_order.findIndex(ext => ext === a.name.split('.').pop()) || 100
    const b_order = file_order.findIndex(ext => ext === b.name.split('.').pop()) || 100
    if (a_order < b_order) {
      return -1
    }
    if (b_order < a_order) {
      return 1
    }
    return 0
  })

  if (artifactsToDisplay.length) {
    text += '\n| Asset type | Download link |\n|-|-|'
  }

  for (let artifact of artifactsToDisplay) {
    if (!artifact.expired && artifact.name != "pr_number") {
      const extension = artifact.name.split('.').pop()
      const readableName = (file_manifest[extension] || {}).description || artifact.name
      text += `\n| ${readableName} | [${artifact.name}](${repoHtmlUrl}/suites/${checkSuiteNumber}/artifacts/${artifact.id.toString()}) |`
    }
  }

  const screenshotArtifact = artifacts.find(
    (artifact) => artifact.name === 'smoke_test_screenshot' && !artifact.expired
  )
  if (screenshotArtifact) {
    const screenshotUrl = `${repoHtmlUrl}/suites/${checkSuiteNumber}/artifacts/${screenshotArtifact.id.toString()}`
    text += `\n\n<details>\n<summary>Smoke test screenshot</summary>\n\n[Download screenshot](${screenshotUrl})\n\n</details>`
  }

  return text
}


async function findComment(github, context, issue_number, header) {
  let comment;
  let page = 1
  while (!comment) {
    const request = await github.rest.issues.listComments({
      issue_number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      page,
    })
    const comments = request.data
    if (!comments.length) {
      return;
    }
    comment = comments.find(c => c.body && c.body.includes(header))
    if (comment) {
      return comment.id.toString()
    }
    page += 1;
  }
}

async function upsertComment(github, context, issue_number, header, body) {
  const commentId = await findComment(github, context, issue_number, header);
  if (commentId) {
    await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: commentId,
      body,
    });
  } else {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number,
      body,
    });
  }
}

async function uploadReleaseAsset(github, context, filePath, release_id) {
  const name = path.basename(filePath);
  const extension = path.extname(name)
  const label = (file_manifest[extension] || {}).description || name
  await github.rest.repos.uploadReleaseAsset({
    owner: context.repo.owner,
    repo: context.repo.repo,
    release_id,
    name,
    label,
    data: fs.readFileSync(filePath),
  });
}

const npmVersionsHeader = '**npm Package Versions**';

/**
 * Generate the npm version check report body. Runs in pull_request context
 * (no write permissions needed). Returns { body, hasContent } where body
 * is the markdown comment text (or null if no packages were affected).
 */
function generateNpmVersionReport(baseSha) {
  const { execSync } = require('child_process');

  // Find all changed files under packages/
  const allChanged = execSync(`git diff --name-only ${baseSha} -- packages/`)
    .toString().trim().split('\n').filter(Boolean);

  // Group changed files by package directory
  const changedByPkg = {};
  for (const file of allChanged) {
    const parts = file.split('/');
    if (parts.length < 2) continue;
    const pkgDir = parts.slice(0, 2).join('/');
    if (!changedByPkg[pkgDir]) changedByPkg[pkgDir] = [];
    changedByPkg[pkgDir].push(file);
  }

  const publishRows = [];
  const warningRows = [];

  for (const [pkgDir, files] of Object.entries(changedByPkg)) {
    const pkgJsonPath = path.join(pkgDir, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) continue;

    const newPkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    if (newPkg.private === true || newPkg.private === 'true') continue;

    let oldPkg;
    try {
      oldPkg = JSON.parse(execSync(`git show ${baseSha}:${pkgJsonPath}`, { encoding: 'utf8' }));
    } catch {
      // New package — will be published
      publishRows.push(`| ${newPkg.name} | _new_ | ${newPkg.version} |`);
      continue;
    }

    const versionBumped = oldPkg.version !== newPkg.version;
    if (versionBumped) {
      publishRows.push(`| ${newPkg.name} | ${oldPkg.version} | ${newPkg.version} |`);
    } else {
      const count = files.length;
      warningRows.push(`| ${newPkg.name} | ${newPkg.version} | ${count} |`);
    }
  }

  const sections = [];
  if (publishRows.length) {
    sections.push(
      `Merging this PR will publish the following packages to npm:\n\n` +
      `| Package | Current | New |\n|-|-|-|\n${publishRows.join('\n')}`
    );
  }
  if (warningRows.length) {
    sections.push(
      `> [!WARNING]\n` +
      `> The following packages have changed files but no version bump:\n\n` +
      `| Package | Version | Changed files |\n|-|-|-|\n${warningRows.join('\n')}\n\n` +
      `If these changes affect published code, consider bumping the version.`
    );
  }

  if (sections.length) {
    return `### ${npmVersionsHeader}\n\n${sections.join('\n\n')}`;
  }
  return null;
}

/**
 * Post or update the npm version check comment on a PR. Runs in
 * workflow_run context (with write permissions). Pass body from
 * generateNpmVersionReport, or null to delete any existing comment.
 */
async function postNpmVersionComment(github, context, prNumber, body) {
  if (body) {
    await upsertComment(github, context, prNumber, npmVersionsHeader, body);
  } else {
    const commentId = await findComment(github, context, prNumber, npmVersionsHeader);
    if (commentId) {
      await github.rest.issues.deleteComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: commentId,
      });
    }
  }
}

module.exports = {
  findComment,
  generateAssetComment,
  generateNpmVersionReport,
  postNpmVersionComment,
  uploadReleaseAsset,
  upsertComment,
}
