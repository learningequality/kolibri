#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <package-name> [version]"
  echo ""
  echo "Examples:"
  echo "  $0 kolibri-format 1.0.1    # specific version"
  echo "  $0 kolibri-format           # latest version"
  exit 1
fi

package="$1"
version="${2:-$(npm view "$package" version 2>/dev/null)}" || {
  echo "Error: package '$package' not found on npm"
  exit 1
}

attestation_url="https://registry.npmjs.org/-/npm/v1/attestations/${package}@${version}"
response=$(curl -sf "$attestation_url") || {
  echo "Error: no attestations found for ${package}@${version}"
  exit 1
}

# Find the SLSA provenance attestation and decode the payload
provenance=$(node -e "
  const data = JSON.parse(process.argv[1]);
  const slsa = data.attestations.find(
    a => a.predicateType === 'https://slsa.dev/provenance/v1'
  );
  if (!slsa) {
    console.error('No SLSA provenance attestation found');
    process.exit(1);
  }
  const payload = JSON.parse(
    Buffer.from(slsa.bundle.dsseEnvelope.payload, 'base64').toString()
  );
  const dep = payload.predicate.buildDefinition.resolvedDependencies[0];
  const commit = dep.digest.gitCommit;
  const ref = dep.uri.split('@')[1];
  const runUrl = payload.predicate.runDetails.metadata.invocationId;
  console.log(commit);
  console.log(runUrl);
  console.log(ref);
" "$response")

commit=$(echo "$provenance" | sed -n '1p')
run_url=$(echo "$provenance" | sed -n '2p')
ref=$(echo "$provenance" | sed -n '3p')

echo "${package}@${version}"
echo "  Commit: $commit"
echo "  Run:    $run_url"
echo "  Branch: $ref"
