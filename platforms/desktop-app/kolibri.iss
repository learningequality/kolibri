; === Preprocessor Definitions: A single source of truth for configuration ===
#define AppName "Kolibri"
#define AppPublisher "Learning Equality"
#define AppPublisherURL "https://learningequality.org/"
#define AppExeName "KolibriApp.exe"
#define ServiceName AppName
#ifndef AppVersion
  #error "The AppVersion definition must be passed to the compiler via the command line, e.g., /DAppVersion=x.y.z"
#endif
#define SourceDir "dist\" + AppName + "-" + AppVersion

[Setup]
; A unique AppId is CRITICAL for Windows to correctly identify the application.
AppId={{432F09E1-B036-4A2C-8F99-DAB7FA094507}}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppPublisherURL}
DefaultDirName={autopf64}\{#AppName}
OutputDir=dist-installer
OutputBaseFilename=kolibri-setup-{#AppVersion}
WizardStyle=modern
PrivilegesRequired=admin
UninstallDisplayIcon={app}\{#AppExeName}
SetupLogging=yes
CloseApplicationsFilter={#AppExeName}

[Registry]
; This registry key is used to detect the installed version for upgrades/repairs.
Root: HKLM; Subkey: "Software\Kolibri"; ValueType: string; ValueName: "Version"; ValueData: "{#AppVersion}"; Flags: uninsdeletekey

[Tasks]
Name: "installservice"; Description: "Install Kolibri as a Windows Service (starts on boot)"; GroupDescription: "Installation Type:";
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}";

[Dirs]
Name: "{commonappdata}\kolibri"

[Files]
; WebView2 runtime installer, placed in {tmp} and deleted after installation
Source: "MicrosoftEdgeWebView2RuntimeInstallerX64.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall

Source: "{#SourceDir}\{#AppName}-{#AppVersion}.exe"; DestDir: "{app}"; DestName: "{#AppExeName}"; Flags: ignoreversion
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#AppName}-{#AppVersion}.exe"
Source: "nssm.exe"; DestDir: "{app}\nssm"; Flags: ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Run]
; Run WebView2 installer only if runtime is not already installed
Filename: "{tmp}\MicrosoftEdgeWebView2RuntimeInstallerX64.exe"; \
    Parameters: "/silent /install"; \
    Flags: runhidden waituntilterminated; \
    Check: not IsWebView2Installed
; Launch app UI after installation completes
Filename: "{app}\{#AppExeName}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall shellexec

[UninstallRun]
; Service uninstallation sequence - stops and removes service before file deletion
; 1. Stop the Kolibri service.
Filename: "net.exe"; Parameters: "stop {#AppName}"; Flags: runhidden waituntilterminated; RunOnceId: "stopservice"
; 2. Remove the Kolibri service definition.
Filename: "{app}\nssm.exe"; Parameters: "remove {#AppName} confirm"; Flags: runhidden waituntilterminated; RunOnceId: "removeservice"
; 3. Stop the UI process
Filename: "{sys}\taskkill.exe"; Parameters: "/F /IM {#AppExeName}"; Flags: runhidden waituntilterminated; RunOnceId: "killapp"

[Code]

// Constants to avoid magic numbers
const
  TASKKILL_ERR_NOT_FOUND = 128;

// Robust wrapper for executing external commands with error checking
procedure ExecChecked(const Filename, Params, WorkingDir: String; const Description: String);
var
   ResultCode: Integer;
begin
   Log(Format('Executing command: %s', [Description]));
   Log(Format('   -> File: %s', [Filename]));
   Log(Format('   -> Parameters: %s', [Params]));
   if not Exec(Filename, Params, WorkingDir, SW_HIDE, ewWaitUntilTerminated, ResultCode) then
   begin
      // if the process fails to launch
      Log(Format('ERROR: Failed to launch process for "%s". System Error: %s', [Description, SysErrorMessage(ResultCode)]));
      if not WizardSilent() then
         MsgBox(Format('A critical error occurred while trying to run a setup command: %s.'#13#10'The installation cannot continue.', [Description]), mbError, MB_OK);
      Abort;
   end;
   if ResultCode <> 0 then
   begin
      Log(Format('ERROR: Command "%s" failed with a non-zero exit code: %d.', [Description, ResultCode]));
      if not WizardSilent() then
         MsgBox(Format('A command required for setup failed to execute correctly: %s.'#13#10'Error Code: %d'#13#10'The installation cannot continue.', [Description, ResultCode]), mbError, MB_OK);
      Abort;
   end
   else
   begin
      Log(Format('Command "%s" completed successfully.', [Description]));
   end;
end;

// Check for existing versions and handle upgrade/downgrade/repair scenarios
function InitializeSetup(): Boolean;
var
   InstalledVersionString, InstallerVersionString: string;
   InstalledVersionPacked, InstallerVersionPacked: Int64;
   VersionDiff: Integer;
begin
   Result := True;
   InstallerVersionString := '{#AppVersion}';

   // Read installed version from registry
   if not RegQueryStringValue(HKLM, 'Software\Kolibri', 'Version', InstalledVersionString) then
   begin
      Log('No previous installation detected. Proceeding with a fresh install.');
      Exit; // No previous installation, proceed with fresh install
   end;

   Log(Format('Found installed version: %s. This installer version: %s.', [InstalledVersionString, InstallerVersionString]));

   // Parse both installer and installed version strings for comparison
   if (not StrToVersion(InstallerVersionString, InstallerVersionPacked)) or (not StrToVersion(InstalledVersionString, InstalledVersionPacked)) then
   begin
      Log('ERROR: Could not parse version strings for comparison.');
      Log(Format('  -> Installer Version String: "%s"', [InstallerVersionString]));
      Log(Format('  -> Installed Version String: "%s"', [InstalledVersionString]));
      if not WizardSilent() then
         MsgBox('Could not compare versions due to an invalid version format. Please uninstall the previous version manually and try again.', mbError, MB_OK);
      Result := False;
      Exit;
   end;

   // Log packed version values for debugging
   Log(Format('Packed installer version: %d. Packed installed version: %d.', [InstallerVersionPacked, InstalledVersionPacked]));

   VersionDiff := ComparePackedVersion(InstallerVersionPacked, InstalledVersionPacked);

   if VersionDiff < 0 then
   begin
      Log(Format('Downgrade detected. Installed version %s is newer than installer version %s. Aborting.', [InstalledVersionString, InstallerVersionString]));
      if not WizardSilent() then
         MsgBox(Format('A newer version of {#AppName} (%s) is already installed. The setup will now exit.', [InstalledVersionString]), mbInformation, MB_OK);
      Result := False;
   end
   else if VersionDiff = 0 then
   begin
      Log('Same version detected. Proposing a repair/reinstall.');
      if not WizardSilent() then
      begin
         if MsgBox('This version of {#AppName} is already installed.' + #13#10#13#10 + 'Do you want to repair the installation by reinstalling it?', mbConfirmation, MB_YESNO) <> IDYES then
            Result := False;
      end;
   end
   else // VersionDiff > 0
   begin
      Log('Older version detected. Proposing an upgrade.');
      if not WizardSilent() then
      begin
         if MsgBox(Format('An older version of {#AppName} (%s) was detected.' + #13#10#13#10 + 'Do you want to upgrade to version {#AppVersion}?', [InstalledVersionString]), mbConfirmation, MB_YESNO) <> IDYES then
            Result := False;
      end;
   end;
end;

// Pre-installation cleanup to unlock files for upgrades
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
begin
  Log('Setup is preparing to install. Attempting to stop the Kolibri service if it exists...');
  Exec(ExpandConstant('{sys}\sc.exe'), 'stop "{#ServiceName}"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  if ResultCode = 0 then
    Log('Service "{#ServiceName}" stopped successfully.')
  else
    Log(Format('Command "sc stop" finished with exit code %d. This is normal if the service was not running.', [ResultCode]));

  // Force-kill any running UI processes
  Exec(ExpandConstant('{sys}\taskkill.exe'),
       '/F /IM "{#AppExeName}"',
       '',
       SW_HIDE, ewWaitUntilTerminated,
       ResultCode);

  if ResultCode = 0 then
    Log('Successfully killed Kolibri UI.')
  else if ResultCode = TASKKILL_ERR_NOT_FOUND then
    Log('No running Kolibri UI found (taskkill returned expected error code).')
  else
  begin
    Log(Format('Unexpected taskkill exit code: %d', [ResultCode]));
  end;

  Result := '';
end;

// Check if Windows service is installed
function IsServiceInstalled(const ServiceName: string): Boolean;
var
  ResultCode: Integer;
begin
  // Use 'sc.exe query' - non-zero exit code means service doesn't exist
  // Don't use ExecChecked since non-zero exit code is expected for missing services
  Exec(ExpandConstant('{sys}\sc.exe'), 'query "' + ServiceName + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := (ResultCode = 0);
  if Result then
    Log(Format('Checked for service "%s". Exists: yes. (sc.exe query exit code: %d)', [ServiceName, ResultCode]))
  else
    Log(Format('Checked for service "%s". Exists: no. (sc.exe query exit code: %d)', [ServiceName, ResultCode]));
end;

// Configure service after file installation
procedure CurStepChanged(CurStep: TSetupStep);
var
  AppPath, AppDir, NssmPath, Params: String;
  ResultCode: Integer;
begin
  // Only act after file installation is complete
  if (CurStep = ssPostInstall) then
  begin
    // Pre-expand constants for clarity
    AppPath := ExpandConstant('{app}\{#AppExeName}');
    AppDir := ExpandConstant('{app}');
    NssmPath := ExpandConstant('{app}\nssm\nssm.exe');

    // Check if user selected service installation
    if (WizardIsTaskSelected('installservice')) then
    begin
      Log('Post-install step: User selected to install/update the Kolibri service...');

      // Check if service exists to decide install vs update
      if IsServiceInstalled('{#ServiceName}') then
      begin
        // Update existing service
        Log('Service "{#ServiceName}" already exists. Updating configuration...');
        Params := 'set "{#ServiceName}" Application "' + AppPath + '"';
        ExecChecked(NssmPath, Params, '', 'Update Service Executable Path');

        Params := 'set "{#ServiceName}" AppParameters "--run-as-server"';
        ExecChecked(NssmPath, Params, '', 'Update Service Parameters');

        Params := 'set "{#ServiceName}" AppDirectory "' + AppDir + '"';
        ExecChecked(NssmPath, Params, '', 'Update Service Working Directory');
      end
      else
      begin
        // Install new service
        Log('Service "{#ServiceName}" not found. Performing fresh installation...');
        Params := 'install "{#ServiceName}" "' + AppPath + '" --run-as-server';
        ExecChecked(NssmPath, Params, '', 'Install {#ServiceName} Service');
      end;

      // Apply common service configuration
      Log('Applying common service configuration...');
      ExecChecked(NssmPath, 'set "{#ServiceName}" ObjectName "NT AUTHORITY\LocalService"', '', 'Set Service User to LocalService');

      // Grant Full Control to service account
      ExecChecked(ExpandConstant('{sys}\icacls.exe'), '"' + ExpandConstant('{commonappdata}\kolibri') + '" /grant "NT AUTHORITY\LocalService":(OI)(CI)F /T', '', 'Grant Permissions to Data Folder for Service');

      // Grant Modify access to Users for UI app state/logs
      ExecChecked(ExpandConstant('{sys}\icacls.exe'), '"' + ExpandConstant('{commonappdata}\kolibri') + '" /grant "Users":(OI)(CI)M /T', '', 'Grant Permissions to Data Folder for Users');

      ExecChecked(NssmPath, 'set "{#ServiceName}" Start SERVICE_AUTO_START', '', 'Set Service Start Type to Automatic');
      ExecChecked(ExpandConstant('{sys}\sc.exe'), 'start "{#ServiceName}"', '', 'Start {#ServiceName} Service');
      ExecChecked(NssmPath, 'set "{#ServiceName}" Description "This service runs the Kolibri server in the background"', '', 'Set Service Description');
      Log('Service configuration completed successfully.');
    end
    else
    begin
      // Remove existing service if user unchecked service task
      Log('Service task was not selected. Checking for pre-existing service to remove.');
      if IsServiceInstalled('{#ServiceName}') then
      begin
        Log('Found existing service "{#ServiceName}". Stopping and removing it as requested by user.');

        // Stop service (okay if it fails - may already be stopped)
        Exec(ExpandConstant('{sys}\net.exe'), 'stop "{#ServiceName}"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
        if ResultCode = 0 then
          Log('Service stopped successfully.')
        else
          Log(Format('net stop command finished with exit code %d. This is acceptable if the service was not running.', [ResultCode]));

        // Remove service definition (use ExecChecked - user should know if this fails)
        ExecChecked(NssmPath, 'remove "{#ServiceName}" confirm', '', 'Remove {#ServiceName} Service');
        Log('Service removed successfully.');
      end
      else
      begin
        Log('No pre-existing service found. No removal action needed.');
      end;
    end;
  end;
end;

// Check if WebView2 Runtime is installed to avoid unnecessary installer run
function IsWebView2Installed(): Boolean;
var
    Version: String;
begin
    if RegQueryStringValue(HKLM, 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) then
    begin
        Log('Found WebView2 Runtime version ' + Version + ' (system-wide).');
        Result := True;
    end
    else if RegQueryStringValue(HKCU, 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) then
    begin
        Log('Found WebView2 Runtime version ' + Version + ' (per-user).');
        Result := True;
    end
    else
    begin
        Log('WebView2 Runtime not found. The installer will be run.');
        Result := False;
    end;
end;
