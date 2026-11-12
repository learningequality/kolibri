Feature: Windows app
  New and existing users need to be able to install the *Kolibri* Windows app and use it on both a single user and multi user device

  Background:
    Given TODO

  Scenario: Windows app installation
  	Given that the kolibri-server is not installed and running
  	When I download the .exe installer for Kolibri
    	And I double-click the downloaded *.exe* file
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
    	And I see that *Run *Kolibri* automatically when the computer starts* and *Create a desktop icon* are selected by default
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
    	And I see the *Kolibri* app running
    	And I see the *How are you using Kolibri?* step of the setup wizard

  Scenario: Upgrade *Kolibri* from a previous version to *Kolibri 0.20*
    Given that a previous version of *Kolibri* is installed on Windows
      And existing user data and channels are present on the device //by default available at C:\Users\<username>\.kolibri
      And the *Kolibri* server process is stopped
    When I run the *Kolibri* 0.20 installer file as an administrator user
      And I proceed through the *Kolibri Setup Wizard* using default settings
    Then I see the installation completes successfully
    	And I see *Setup has finished installing Kolibri on your computer. The application may be launched by selecting the installed shortcuts. Click Finish to exit Setup.
    	And I see that the checkbox *Launch Kolibri* is selected by default
    When I click the *Finish* button
    launch the *Kolibri* application
    Then *Kolibri* starts without an error
      And all existing user accounts, class data, and content channels are preserved and available at *C:\ProgramData\kolibri*

  Scenario: Uninstall *Kolibri* while retaining user data
    Given that *Kolibri* is installed and currently running
    When I go to *Control Panel\Programs\Programs and Features*
      And I select *Kolibri* and click *Uninstall*
      And I confirm the uninstall prompt
      And I click *No* when prompted to remove the user data
      And I click *Yes* at the *Are you sure you want to completely remove Kolibri and all of its components* modal
    Then the *Kolibri* service and app processes terminate cleanly
      And the application binaries in the installation directory are removed
      And I see a *Kolibri was successfully removed from your computer* message
      And the user data at *C:\ProgramData\kolibri* remains on disk

  Scenario: Install *Kolibri* on top of a previously installed 0.20 version
  	Given that *Kolibri* is uninstalled
	    And the user data from a previous *Kolibri 0.20* version is available at *C:\ProgramData\kolibri*
	  When I install a new version of *Kolibri*
	  	And I launch the app
	  Then I see all of the preexisting data and settings

	Scenario: Uninstall *Kolibri* while fully removing user data
    Given that *Kolibri* is installed and currently running
    When I go to *Control Panel\Programs\Programs and Features*
      And I select *Kolibri* and click *Uninstall*
      And I confirm the uninstall prompt
      And I click *Yes* when prompted to remove the user data
      And I click *Yes* at the *Are you sure you want to completely remove Kolibri and all of its components* modal
    Then the *Kolibri* service and app processes terminate cleanly
      And the application binaries in the installation directory are removed
      And I see a *Kolibri was successfully removed from your computer* message
      And I see that the user data at *C:\ProgramData\kolibri* is completely removed

  Scenario: Open Kolibri in browser
    Given the Kolibri application window is open and the server is running
    When I click the *File* option
      And I click *Open Kolibri in browser*
    Then I see the default Web Browser open navigating to http://localhost:<port>

  Scenario: Open Kolibri's Home folder
    Given the Kolibri application window is open and the server is running
    When I click the *File* option
      And I click *Open Kolibri Home Folder*
    Then I see Windows File Explorer open displaying the active *Kolibri* data directory at *C:\ProgramData\kolibri*

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
    	And in the *Services* tab I can see that the *Kolibri* service is with status *Stopped*

  Scenario: Toggle on the Kolibri Service on Windows startup
    Given the Kolibri system tray icon is visible in the Windows system tray
    	And the *Run Kolibri Service on Windows startup* option is unchecked
    When I right-click the system tray icon
      And I check *Run Kolibri Service on Windows startup*
    Then the server restarts
    	And I see a *Kolibri Service Updated* notification
    	And I see in the Windows task manager that the app is added to the *Startup* list with programs
    	And in the *Services* tab I can see that the *Kolibri* service is with status *Running*

  Scenario: Close Kolibri from the system tray
    Given the Kolibri system tray icon is visible in the Windows system tray
    When I right-click the system tray icon
      And I click *Close*
    Then I see the background server terminate cleanly
      And I see the system tray icon disappear
