Feature: Windows app
  New and existing users need to be able to install the Kolibri Windows app and use it on both a single user and multi user device

  Background:
    Given I'm an administrator user on a Windows 10 or Windows 11 device
    	And I have downloaded the *.exe* installer for *Kolibri*

  Scenario: Windows app first time installation
  	Given that the kolibri-server is not installed and running
    When I double-click the downloaded *.exe* installer for *Kolibri*
    Then I see the *Select Setup Language* screen
    	And I see a *Select the language to use during the installation.* text
    	And I see a language selector drop-down
    	And I see an *OK* and a *Cancel* button
    When I click the *OK* button
    Then I see the *Select Destination Location* screen
    	And I see that *C:\Program Files\Kolibri* is the default path
    When I click the *Next* button
    Then I see the *Select Start Menu Folder* screen
    	And I see that *(Default)* is the default value
    When I click the *Next* button
    Then I see the *Select Additional Tasks* screen
    	And I see that *Run Kolibri automatically when the computer starts* and *Create a desktop icon* are selected by default
    When I click the *Next* button
    Then I see the *Ready to Install* screen
    When I click the *Install* button
    Then I see the *Installing* screen
    	And I see a progress bar
    	And I see a *Cancel* button
    When the copying of files has finished
    Then I see the *Completing the Kolibri Setup Wizard* screen
    	And I see a text informing me that the setup has finished
    	And I see a checked checkbox *Launch Kolibri*
    	And I see a *Finish* button
    When I click the *Finish* button
    Then I see a *Kolibri is starting* notification in the notification bar
    	And I see the Kolibri app running
    	And I see the *How are you using Kolibri?* step of the setup wizard

  Scenario: Upgrade Kolibri from a previous version to Kolibri 0.20
    Given that a previous version of Kolibri is installed on Windows
      And existing user data and channels are present on the device #by default available at C:\Users\<username>\.kolibri
      And the Kolibri server process is stopped
    When I run the Kolibri 0.20 installer file as an administrator user
      And I proceed through the *Kolibri Setup Wizard* using default settings
    Then I see that the installation completes successfully
    	And I see *Setup has finished installing Kolibri on your computer. The application may be launched by selecting the installed shortcuts. Click Finish to exit Setup.*
    	And I see that the checkbox *Launch Kolibri* is selected by default
    When I click the *Finish* button
    Then Kolibri starts without an error
      And all existing user accounts, class data, and content channels are preserved and available at *C:\ProgramData\kolibri*

  Scenario: Uninstall Kolibri while retaining user data
    Given that Kolibri is installed and currently running
    When I go to *Control Panel\Programs\Programs and Features*
      And I select Kolibri and click *Uninstall*
      And I confirm the uninstall prompt
      And I click *No* when prompted to remove the user data
      And I click *Yes* at the *Are you sure you want to completely remove Kolibri and all of its components* modal
    Then the Kolibri service and app processes terminate cleanly
      And the application binaries in the installation directory are removed
      And I see a *Kolibri was successfully removed from your computer* message
      And the user data at *C:\ProgramData\kolibri* remains on disk

  Scenario: Install Kolibri on top of a previously installed 0.20 version
  	Given that Kolibri is uninstalled
	    And the user data from a previous *Kolibri 0.20* version is available at *C:\ProgramData\kolibri*
	  When I install a new version of *Kolibri*
	  	And I launch the app
	  Then I see all of the preexisting data and settings

	Scenario: Uninstall Kolibri while fully removing user data
    Given that Kolibri is installed and currently running
    When I go to *Control Panel\Programs\Programs and Features*
      And I select Kolibri and click *Uninstall*
      And I confirm the uninstall prompt
      And I click *Yes* when prompted to remove the user data
      And I click *Yes* at the *Are you sure you want to completely remove Kolibri and all of its components* modal
    Then the Kolibri service and app processes terminate cleanly
      And the application binaries in the installation directory are removed
      And I see a *Kolibri was successfully removed from your computer* message
      And I see that the user data at *C:\ProgramData\kolibri* is completely removed

  Scenario: Automatic OS-user sign-in and role assignment
    Given that Kolibri is installed
      And the initial setup wizard has been completed
      And a Windows administrator user <kadmin> and a standard Windows user <klearner> exist on the device
    When I sign in to Windows as <kadmin>
      And I open the Kolibri app
    Then I am automatically signed in to Kolibri as <kadmin> without seeing a login prompt
      And my Kolibri account has *Super admin* privileges
    When I sign out of Windows and sign in as <klearner>
      And I open the Kolibri app
    Then I am automatically signed in to Kolibri as <klearner>
      And my Kolibri account has *Learner* privileges and cannot access *Device*, *Facility* and *Coach* pages

  Scenario: Standard (non-admin) Windows user completes the initial setup wizard first and becomes a Super admin
    Given that Kolibri is freshly installed and the setup wizard has not yet been completed
      And a standard Windows user <klearner>, a second standard Windows user <Jane Doe>, and a Windows administrator user <kadmin> exist on the device
    When I sign in to Windows as <klearner>
      And I open the Kolibri app and complete the setup wizard
    Then I am signed in to Kolibri as <klearner>
      And <klearner> is assigned *Super admin* privileges and can see *Device*, *Facility*, and *Coach* in the side menu
    When I sign out of Windows and sign in as <kadmin>
      And I open the Kolibri app
    Then I am automatically signed in to Kolibri as <kadmin>
      And <kadmin> is also assigned *Super admin* privileges
    When I sign out of Windows and sign in as <Jane Doe>
      And I open the Kolibri app
    Then I am automatically signed in to Kolibri as <Jane_Doe>
      And <Jane_Doe> is assigned *Learner* privileges and cannot access *Device*, *Facility*, or *Coach* pages

  Scenario: Access Kolibri data across multiple Windows user accounts
    Given that Kolibri is installed
      And as a super admin user <kadmin> I have imported channels, setup a facility, created classes with users and assigned lessons and quizzes to them
    When I sign out of Windows and sign in as <kuser> on the same device
      And I open the Kolibri app
    Then Kolibri loads without showing the initial setup wizard
      And I can sign in as any of the users created by <kadmin> #provided that I know the user credentials
      And all data and content channels from *C:\ProgramData\kolibri* are available

  Scenario: Windows usernames with spaces or special characters are sanitized
    Given that Kolibri is installed and running in service mode
      And a Windows user account named <Jane Doe> exists on the device
    When I sign in to Windows as <Jane Doe>
      And I open the Kolibri app
    Then I am automatically signed in to *Kolibri*
      And my generated Kolibri username is sanitized to <Jane_Doe>

  Scenario: Setup wizard pre-populates Device and Facility names from the OS user
    Given that Kolibri is freshly installed in service mode by Windows user <kadmin>
      And the initial Kolibri setup wizard has not yet been completed
    When I launch the Kolibri app for the first time
      And at *How are you using Kolibri* I keep the default *On my own* option
      And I complete the setup wizard
    Then I am signed in to Kolibri as <kadmin>
    When I go to *Device > Settings*
    Then I see that the *Device name* is *Personal device for <kadmin>*
    When I go to *Facility > Settings*
    Then I see that the *Facility name* is *Home Facility for <kadmin>*

  Scenario: Launching Kolibri when an instance is already running
    Given the Kolibri app is running in the background with its window closed
    When I double-click the Kolibri desktop shortcut
    Then no duplicate background server processes are started
      And the existing Kolibri application window opens in the foreground

  Scenario: Closing the main window minimizes Kolibri to the system tray
    Given the Kolibri application window is open and the server is running
    When I click the *X* (Close) button on the top-right of the Kolibri application window
    Then the Kolibri application window closes
      And the Kolibri system tray icon remains visible in the Windows system tray
      And Kolibri remains accessible via http://localhost:<port> in a web browser

  Scenario: Open Kolibri in browser
    Given the Kolibri application window is open and the server is running
    When I click the *File* option
      And I click *Open Kolibri in browser*
    Then I see the default Web Browser open navigating to http://localhost:<port>

  Scenario: Open Kolibri's Home folder
    Given the Kolibri application window is open and the server is running
    When I click the *File* option
      And I click *Open Kolibri Home Folder*
    Then I see Windows File Explorer open displaying the active Kolibri data directory at *C:\ProgramData\kolibri*

  Scenario: Zoom In view
    Given the Kolibri application window is open
    When I click the *View* option
      And I click *Zoom In*
    Then I see the application's interface zoom level increase

  Scenario: Zoom Out view
    Given the Kolibri application window is open
    When I click the *View* option
      And I click *Zoom Out*
    Then I see the application's interface zoom level decrease

  Scenario: Reset view to Actual Size
    Given the Kolibri application window is open
    When I click the *View* option
      And I click *Actual Size*
    Then I see the application interface zoom level reset to 100%

  Scenario: Reload current page
    Given the Kolibri application window is open
    When I click the *View* option
      And I click *Reload*
    Then I see the page reloaded

  Scenario: Open Kolibri's documentation
    Given the Kolibri application window is open
    When I click the *Help* option
      And I click *Documentation*
    Then I see the *Kolibri User Guide* open in the default web browser

  Scenario: Open the community forum
    Given the Kolibri application window is open
    When I click the *Help* option
      And I click *Community Forums*
    Then I see the Kolibri community forum open in the default web browser

  Scenario: Show logs
    Given the Kolibri application window is open
    When I click the *Help* option
      And I click *Troubleshooting*
      And I click *Show logs*
    Then I see the log file directory open displaying all of the available logs

  Scenario: Open developer tools
    Given the Kolibri application window is open
    When I click the *Help* option
      And I click *Troubleshooting*
      And I click *Open developer tools*
    Then I see the developer inspection window open attached to the application view

  Scenario: Open About Kolibri modal
    Given the Kolibri application window is open
    When I click the *Help* option
      And I click *About Kolibri*
    Then I see an *About Kolibri* window displaying app version, kolibri version, copyright information and links to the documentation and the community forum

  Scenario: Open Kolibri App from system tray
    Given the Kolibri system tray icon is visible in the Windows system tray
    When I right-click the system tray icon
      And I click *Open Kolibri App*
    Then I see the main application window brought to the foreground

  Scenario: Toggle off launching Kolibri after sign in
    Given the Kolibri system tray icon is visible in the Windows system tray
    When I right-click the system tray icon
      And I uncheck the *Open Kolibri app after sign in* option
    Then I see a notification that the option has been disabled

  Scenario: Toggle on launching Kolibri after sign in
    Given the Kolibri system tray icon is visible in the Windows system tray
    	And the *Open Kolibri app after sign in* option is unchecked
    When I right-click the system tray icon
      And I check the *Open Kolibri app after sign in* option
    Then I see a notification that the option has been enabled

  Scenario: Toggle off the Kolibri Service on Windows startup
    Given the Kolibri system tray icon is visible in the Windows system tray
    	And the *Run Kolibri Service on Windows startup* option is checked
    When I right-click the system tray icon
      And I uncheck *Run Kolibri Service on Windows startup*
    Then the server restarts
    	And I see a *Kolibri Service Updated* notification
    	And I see in the Windows task manager that the app is removed from the *Startup* list with programs
    	And in the *Services* tab I can see that the Kolibri service is with status *Stopped*

  Scenario: Toggle on the Kolibri Service on Windows startup
    Given the Kolibri system tray icon is visible in the Windows system tray
    	And the *Run Kolibri Service on Windows startup* option is unchecked
    When I right-click the system tray icon
      And I check *Run Kolibri Service on Windows startup*
    Then the server restarts
    	And I see a *Kolibri Service Updated* notification
    	And I see in the Windows task manager that the app is added to the *Startup* list with programs
    	And in the *Services* tab I can see that the Kolibri service is with status *Running*

  Scenario: Standard (non-admin) Windows user toggles Kolibri Service setting
    Given I am signed in as a standard (non-administrator) Windows user
      And the Kolibri system tray icon is visible in the Windows system tray
    When I right-click the system tray icon
      And I click *Run Kolibri Service on Windows startup*
    Then I see a Windows User Account Control (UAC) prompt asking for administrator credentials

  Scenario: Local network users can access Kolibri when the service is running and no user is signed in to Windows
    Given that Kolibri is installed with *Run Kolibri Service on Windows startup* checked
      And the Kolibri service is *Running* in *services.msc*
      And I have noted the external *Server URL* (e.g., http://<host-ip>:<port>) from *Device > Info*
    When I sign out of my Windows user account so the device is at the Windows lock/sign-in screen
      And a user on a separate client device on the same local network opens a browser and navigates to the *Server URL*
    Then the Kolibri sign in page loads on the client device
      And the client user can sign in and interact with learning resources while no Windows user is signed in on the host

  Scenario: Local network users cannot access Kolibri after sign-out when the service is stopped
    Given that Kolibri is installed and running
      And I have noted the external *Server URL* from *Device > Info*
      And I have unchecked *Run Kolibri Service on Windows startup* in the system tray menu so that the Kolibri service is *Stopped* in *services.msc*
    When I sign out of my Windows user account
      And a user on a separate client device on the same local network attempts to navigate to the *Server URL*
    Then the connection fails and Kolibri is unreachable from the local network

  Scenario: Close Kolibri from the system tray
    Given the Kolibri system tray icon is visible in the Windows system tray
    	And the Kolibri service is *Stopped* in *services.msc*
    When I right-click the system tray icon
      And I click *Close*
    Then I see the background server terminate cleanly
      And I see the system tray icon disappear
