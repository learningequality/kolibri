@echo off
rem This will download the Kolibri windows installer artifact at the windows-2016 buildkite agent.
rem After the installer successfully sign it will upload the signed installer at the Sign Windows installer pipeline artifact.

set current_path=%cd%

buildkite-agent.exe artifact download "installer/*.exe" . --step "Build kolibri windows installer" --build %BUILDKITE_BUILD_ID% --agent-access-token %BUILDKITE_AGENT_ACCESS_TOKEN%
%WINDOWS_SIGN_SCRIPT_PATH% "%current_path%\installer" && buildkite-agent.exe artifact upload "installer/*.exe"
