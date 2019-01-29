@echo off
rem This script will download and sign the Kolibri Windows installer artifact build from the "Build Windows installer" Buildkite pipeline step.
rem The signed Windows installer artifact will be uploaded at the "Sign Windows installer" Buildkite step

set current_path=%cd%
buildkite-agent.exe artifact download "dist/*.exe" . --step "Build Windows installer" --build %BUILDKITE_BUILD_ID% --agent-access-token %BUILDKITE_AGENT_ACCESS_TOKEN%
%WINDOWS_SIGN_SCRIPT_PATH% "%current_path%\dist" && cd "%current_path%\dist\" && ren *.exe *-signed.exe && buildkite-agent.exe artifact upload "*.exe"
