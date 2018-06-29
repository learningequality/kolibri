@echo off
rem This will download the Kolibri windows installer artifact at the windows-2016 buildkite agent.
rem After the installer successfully sign it will upload the signed installer at the Sign Windows installer pipeline artifact.
rem To sign the Windows installer set the `SIGN_WINDOWS_INSTALLER=true` environment variable.

IF NOT "%SIGN_WINDOWS_INSTALLER%" == "true" (GOTO DONT_SIGN)

set current_path=%cd%
buildkite-agent.exe artifact download "installer/*.exe" . --step "Build kolibri windows installer" --build %BUILDKITE_BUILD_ID% --agent-access-token %BUILDKITE_AGENT_ACCESS_TOKEN%
%WINDOWS_SIGN_SCRIPT_PATH% "%current_path%\installer" && cd "%current_path%\installer\" && buildkite-agent.exe artifact upload "*.exe"
GOTO END

:DONT_SIGN
echo Set the SIGN_WINDOWS_INSTALLER=true environment variable to sign the Windows installer.

:END