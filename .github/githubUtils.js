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
  return text
}


async function findComment(github, context, issue_number) {
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
    comment = comments.find(c => c.body && c.body.includes(buildArtifactsHeader))
    if (comment) {
      return comment.id.toString()
    }
    page += 1;
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

module.exports = {
  findComment,
  generateAssetComment,
  uploadReleaseAsset,
}
