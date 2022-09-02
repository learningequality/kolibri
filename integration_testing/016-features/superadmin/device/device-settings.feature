Feature: Device settings
	The user needs to be able to change settings related to external devices, default landing page, download on metered connection, storage location, auto-download and enabled pages

  Background:
    Given that the Kolibri installation was successful
    	And I've set up the device
    	And I am signed in
    	And I am at *Device > Settings* page

	Scenario: Change the default language
		When I click the *Change language* dropdown menu
			And I select <language>
			And I click *Save changes*
		Then I see a *Settings have been updated* message
		When I sign out and relaunch the app
		Then I see that the Kolibri UI is displayed in <language> language

	Scenario: Allow external devices to download unlisted channels
		Given I have at least one unlisted channel
		When I click the checkbox *Allow other computers on this network to download my unlisted channels*
		Then I see that the checkbox is checked
		When I click *Save changes*
			And I try to download an unlisted channel using another computer in the same network
		Then I can see the unlisted channel
			And I can download the unlisted channel

	Scenario: Set the default landing page to *Learn page*
    When I select *Learn page* as the *Default landing page*
    Then I see that the *Sign-in page* option is no longer selected
    	And I see that the options *Allow users to access resources without signing in*, *Learners must sign-in to explore resources* and *Signed in learners should only see resources assigned to them in classes* are disabled (grayed out)
    When I click the *Save changes* button
      And I sign out
    Then I see the *Learn > Library* page
    When I sign-in as learner <username>
    Then I also see the *Learn > Library* page

  Scenario: Set the default landing page to *Sign-in page - Allow users to access resources without signing in*
  	When I select *Sign-in page* as the *Default landing page*
  	Then I see that the *Sign-in page* option is selected
  		And I see that the *Allow users to access resources without signing in* option is also selected
  	When I click the *Save changes* button
      And I sign out
    Then I see the *Sign-in* page
    	And I see the *Explore without account* link
    When I click the *Explore without account* link
    Then I see the *Learn > Library* page

  Scenario: Set the default landing page to *Sign-in page - Learners must sign in to explore resources*
		Given I've selected the *Sign-in page* as the *Default landing page*
		When I select the *Learners must sign-in to explore resources* option
			And I click the *Save changes* button
      And I sign out
    Then I see the *Sign-in* page
    	And I don't see the *Explore without account* link

  Scenario: Set the default landing page to *Sign-in page - Signed in learners should only see resources assigned to them in classes*
  	Given I've selected the *Sign-in page* as the *Default landing page*
  	When I select the *Signed in learners should only see resources assigned to them in classes* option
			And I click the *Save changes* button
      And I sign out
    Then I see the *Sign-in* page
    When I sign-in as learner <username>
    Then I see the *Learn > Home* page
      And I don't see the *Library* or *Bookmarks* tabs

	Scenario: Allow download on metered connection
		When I select the *Allow download on a metered connection* option
			And I click the *Save changes* button
		Then I see a *Settings have been updated* message

	Scenario: Change the storage location
		When I click the *Change* link
		Then I see the *Change primary storage location* modal
			And I see *New downloaded resources will be added to the primary storage location*
			And I see only the paths that can be set as the primary storage location
		When I select a path
			And I click *Continue*
		Then I see the *Server restart* modal
			And I see *Changing the primary storage location will restart the server. Anyone using Kolibri on this server right now will temporarily be unable to use it.*
		When I click *Continue*
		Then the modal window is closed
			And the server is restarted in the background

	Scenario: Add storage location
		When I scroll down to *Other storage locations*
			And I select *Add storage location* from the *Options* drop-down
		Then I see the native file picker
		When I select a new storage location
		Then I see the *Server restart* modal
			And I see the *Selected: <path>*
			And I see the *Adding a new storage location will restart the server. Anyone using Kolibri on this server right now will temporarily be unable to use it.*
			And I see a checkbox *Make this the primary storage location*
			And below the checkbox I see *Newly downloaded resources will be added to the primary storage location*
			But the checkbox is not displayed if it's a read-only location
		When I click *Continue*
		Then I see the *Add to library* overlay
			And I see that all channels are selected by default
		When I click *Continue*
		Then the modal window is closed
			And the server is restarted in the background

	Scenario: Remove storage location
		When I scroll down to *Other storage locations*
			And I select *Remove storage location* from the *Options* drop-down
		Then I see the *Remove storage location* modal
			And I see *Removing a storage location will remove access to them on Kolibri, but will not delete the resources from your device. If you want to delete the files from your device after removing the storage location, you will need to manually do so from your device's file system.*
			And I see the available paths
		When I select the storage location that I want to remove
			And I click *Continue*
		Then I see the *Server restart* modal
			And I see *Removing a storage location will restart the server. Anyone using Kolibri on this server right now will temporarily be unable to use it.*
		When I click *Continue*
		Then the modal window is closed
			And the server is restarted in the background

	Scenario: Disable auto-download
		Given the *Enable auto-download* option is checked
		When I uncheck the option
		Then I see both *Enable "Get later"* and *Set auto-download storage limit* options disabled
		When I click the *Save changes* button
			And I go to *Device > Channels* page
		Then I see that the *My downloads* option is not available

	Scenario: Enable auto-download - default selection
		Given the *Enable auto-download* option is not checked
		When I check the *Enable auto-download* checkbox
		Then I see both *Allow learners to download resources* and *Set storage limit for auto-download and learners who download resources* options enabled and checked
		When I go to *My downloads* page
		Then I can see that any resources which are available in the network are being auto-downloaded
		When I've specified a storage limit value
		Then I can see that resources are no longer auto-downloaded once the storage limit is reached

	Scenario: Enable auto-download - learners can download resources
		Given the *Enable auto-download* option is checked
			And the *Allow learners to download resources* option is also checked
			And I am connected to the Internet and a local network
		When I sign in as a learner
			And I go to a resource
		Then I can see an option to download the resource
		When I select the download option
			And I go to *My downloads*
		Then I can see that the resource is downloaded

	Scenario: Enable auto-download - slider state
		Given the *Enable auto-download* option is checked
			And the option *Set storage limit for auto-download and learners who download resources* is also checked
		Then I see that the default storage amount is set to 25MB
		When the available storage gets less than the default setting
		Then the max value of the setting is set to equal to the max value as it fluctuates
		When additional space is freed up
		Then the slider continues to show the previously visible max value
			And it is possible to slide it to the currently available max value
		When the device storage is full
		Then I see 0MB in red
			And I see *No available storage remaining* in red

	Scenario: Enabled pages
		Given all pages are enabled by default
		When I uncheck any or all of the available pages
			And I click the *Save changes* button
		Then a user is no longer able to access the unchecked pages even if the user has permission to access them

	Scenario: Position of the *Save changes* button in the native app
		Given I'm viewing the *Device > Settings* page in the native app
		When I scroll down to the bottom of the container
		Then I see the *Save changes* button positioned to the left side at the bottom of the container

	Scenario: Disabled features
		Given some configuration options have been disabled due to the way Kolibri has been setup
		When I go to *Device > Settings*
		Then I see the following notice: *Some configuration options have been disabled due to the way Kolibri has been setup*
			And I see that all options under *Download on metered connection*, *Auto-download* and *Enabled pages* are disabled
			And I see that the storage location is hidden #for BCK only
			And I see an alert describing why the options are disabled
