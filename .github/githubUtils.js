/* eslint-disable import-x/no-commonjs, import-x/no-amd, import-x/no-import-module-exports */
const { execSync } = require('child_process');
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
    const extension = artifact.name.split('.').pop()
    const readableName = (file_manifest[extension] || {}).description || artifact.name
    text += `\n| ${readableName} | [${artifact.name}](${repoHtmlUrl}/suites/${checkSuiteNumber}/artifacts/${artifact.id.toString()}) |`
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

const packageVersionsHeader = '**Package Versions**';

/**
 * Read name and version from an npm package.json.
 * Returns null when the package is not publishable.
 */
function readPackageJson(contents) {
  const pkg = JSON.parse(contents);
  if (pkg.private === true || pkg.private === 'true') return null;
  if (!pkg.name || !pkg.version) return null;
  return { name: pkg.name, version: pkg.version };
}

/**
 * Read name and version from a pyproject.toml's [project] table.
 * Returns null when the package is not publishable — PyPI rejects any package
 * carrying a `Private ::` classifier, which is how a workspace member opts out.
 */
function readPyproject(contents) {
  const projectLines = [];
  let inProject = false;
  for (const line of contents.split('\n')) {
    const header = line.match(/^\s*\[\[?([^[\]]+)\]\]?\s*$/);
    if (header) {
      inProject = header[1] === 'project';
      continue;
    }
    if (inProject) projectLines.push(line);
  }
  const project = projectLines.join('\n');

  const classifiers = project.match(/^\s*classifiers\s*=\s*\[([^\]]*)\]/m);
  if (classifiers && /["']\s*Private\s*::/.test(classifiers[1])) return null;

  const name = project.match(/^\s*name\s*=\s*["']([^"']+)["']/m);
  const version = project.match(/^\s*version\s*=\s*["']([^"']+)["']/m);
  if (!name || !version) return null;
  return { name: name[1], version: version[1] };
}

const PACKAGE_ECOSYSTEMS = [
  { registry: 'npm', root: 'packages', manifest: 'package.json', read: readPackageJson },
  { registry: 'PyPI', root: 'python_packages', manifest: 'pyproject.toml', read: readPyproject },
];

/**
 * Generate structured version diff data for packages the PR itself changed.
 * Returns { packages: [{registry, name, from, to}],
 *           warnings: [{registry, name, version, changedFiles}] },
 * or null if no publishable packages were affected.
 * Runs in pull_request context (no write permissions needed), against a
 * checkout of the PR head.
 * `from` is null for new packages.
 */
function generatePackageVersionData(baseSha) {
  // A pull_request payload's base.sha is the base branch tip, not the fork
  // point, so diffing straight from it reports the base's own changes back at
  // a PR that is behind.
  const mergeBase = execSync(`git merge-base ${baseSha} HEAD`).toString().trim();

  const packages = [];
  const warnings = [];

  for (const { registry, root, manifest, read } of PACKAGE_ECOSYSTEMS) {
    const allChanged = execSync(`git diff --name-only ${mergeBase} -- ${root}/`)
      .toString().trim().split('\n').filter(Boolean);

    const changedByPkg = {};
    for (const file of allChanged) {
      const parts = file.split('/');
      if (parts.length < 2) continue;
      const pkgDir = parts.slice(0, 2).join('/');
      changedByPkg[pkgDir] = (changedByPkg[pkgDir] || 0) + 1;
    }

    for (const [pkgDir, changedFiles] of Object.entries(changedByPkg)) {
      const manifestPath = path.join(pkgDir, manifest);
      if (!fs.existsSync(manifestPath)) continue;

      const current = read(fs.readFileSync(manifestPath, 'utf8'));
      if (!current) continue;

      let previous = null;
      try {
        previous = read(
          execSync(`git show ${mergeBase}:${manifestPath}`, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
          })
        );
      } catch {
        previous = null;
      }

      if (!previous) {
        packages.push({ registry, name: current.name, from: null, to: current.version });
      } else if (previous.version !== current.version) {
        packages.push({ registry, name: current.name, from: previous.version, to: current.version });
      } else {
        warnings.push({ registry, name: current.name, version: current.version, changedFiles });
      }
    }
  }

  if (packages.length || warnings.length) {
    return { packages, warnings };
  }
  return null;
}

/**
 * Validate structured version diff JSON from the artifact.
 * Returns the parsed data object, or null if the JSON value is null (no packages changed).
 * Throws an Error with a descriptive message on any malformed input.
 */
function validatePackageVersionData(raw) {
  const data = JSON.parse(raw);
  if (data === null) return null;
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('expected object or null at top level');
  }
  if (!Array.isArray(data.packages)) throw new Error('packages must be an array');
  if (!Array.isArray(data.warnings)) throw new Error('warnings must be an array');
  for (const pkg of data.packages) {
    if (typeof pkg.registry !== 'string') throw new Error('package.registry must be a string');
    if (typeof pkg.name !== 'string') throw new Error('package.name must be a string');
    if (pkg.from !== null && typeof pkg.from !== 'string') {
      throw new Error('package.from must be a string or null');
    }
    if (typeof pkg.to !== 'string') throw new Error('package.to must be a string');
  }
  for (const w of data.warnings) {
    if (typeof w.registry !== 'string') throw new Error('warning.registry must be a string');
    if (typeof w.name !== 'string') throw new Error('warning.name must be a string');
    if (typeof w.version !== 'string') throw new Error('warning.version must be a string');
    if (typeof w.changedFiles !== 'number') throw new Error('warning.changedFiles must be a number');
  }
  return data;
}

/**
 * Render the markdown comment body from validated version diff data.
 * Returns the markdown string, or null if there is nothing to report.
 */
function renderPackageVersionMarkdown(data) {
  const publishRows = data.packages.map(
    pkg => `| ${pkg.name} | ${pkg.registry} | ${pkg.from === null ? '_new_' : pkg.from} | ${pkg.to} |`
  );
  const warningRows = data.warnings.map(
    w => `| ${w.name} | ${w.registry} | ${w.version} | ${w.changedFiles} |`
  );

  const sections = [];
  if (publishRows.length) {
    sections.push(
      `Merging this PR will publish the following packages:\n\n` +
      `| Package | Registry | Current | New |\n|-|-|-|-|\n${publishRows.join('\n')}`
    );
  }
  if (warningRows.length) {
    sections.push(
      `> [!WARNING]\n` +
      `> The following packages have changed files but no version bump:\n\n` +
      `| Package | Registry | Version | Changed files |\n|-|-|-|-|\n${warningRows.join('\n')}\n\n` +
      `If these changes affect published code, consider bumping the version.`
    );
  }

  if (sections.length) {
    return `### ${packageVersionsHeader}\n\n${sections.join('\n\n')}`;
  }
  return null;
}

/**
 * Post or update the package version check comment on a PR. Runs in
 * workflow_run context (with write permissions). Pass body from
 * renderPackageVersionMarkdown, or null to delete any existing comment.
 */
async function postPackageVersionComment(github, context, prNumber, body) {
  if (body) {
    await upsertComment(github, context, prNumber, packageVersionsHeader, body);
  } else {
    const commentId = await findComment(github, context, prNumber, packageVersionsHeader);
    if (commentId) {
      await github.rest.issues.deleteComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: commentId,
      });
    }
  }
}

/**
 * Look up the PR for a workflow_run event.
 *
 * Uses pulls.list with a `head: "owner:branch"` filter rather than
 * listPullRequestsAssociatedWithCommit — the latter only knows commits in
 * the base repo's own git tree, so returns [] for fork PRs (the primary
 * case). The workflow_run payload exposes the source branch and source
 * (fork) repo for pull_request-triggered workflows, which is what we
 * need here.
 *
 * Returns the PR number, or null if no PR is found.
 */
async function findPrByHeadSha(github, context) {
  const wr = context.payload.workflow_run;
  if (!wr || !wr.head_repository || !wr.head_branch) {
    return null;
  }

  const headOwner = wr.head_repository.owner.login;
  const headBranch = wr.head_branch;
  const headSha = wr.head_sha;

  const { data: prs } = await github.rest.pulls.list({
    owner: context.repo.owner,
    repo: context.repo.repo,
    head: `${headOwner}:${headBranch}`,
    state: 'all',
    per_page: 100,
    sort: 'updated',
    direction: 'desc',
  });

  // Prefer exact head-SHA match; fall back to the most-recently-updated
  // PR for this head (covers rebases / force-pushes between the upstream
  // run and the comment workflow firing).
  const exact = prs.find(pr => pr.head.sha === headSha);
  const matched = exact || prs[0] || null;
  return matched ? matched.number : null;
}

module.exports = {
  findComment,
  findPrByHeadSha,
  generateAssetComment,
  generatePackageVersionData,
  validatePackageVersionData,
  renderPackageVersionMarkdown,
  postPackageVersionComment,
  uploadReleaseAsset,
  upsertComment,
}
