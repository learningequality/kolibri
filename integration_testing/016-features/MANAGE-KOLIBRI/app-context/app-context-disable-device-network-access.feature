Feature: Disabled network access to Kolibri app server
	If the network access to Kolibri server app is disabled, users who navigate to its URL need to see the notification message

	Background:
		Given that the device setting *Allow others in the network to access Kolibri on this device using a browser* is unchecked
			And I use an external device to connect to the Kolibri app server and access Kolibri

		# You don't need to be in an external device: use an incongnito window, or any other browser where the cookie for the App user is not set

	Scenario: Attempt to connect to the Kolibri app server from an external devices
  		When I type the Kolibri app server URL address on my external device browser
  		Then I see this message on the Kolibri sign in page: *Access to Kolibri has been restricted for external devices. To change this, sign in as a super admin and enable 'Allow others in the network to access Kolibri on this device using a browser', located in Device settings*

	Scenario: Security alert when network access setting is enabled
		When I enable the device setting *Allow others in the network to access Kolibri on this device using a browser*
		Then I see a security alert below the setting *If learners are allowed to sign in with no password on this device, enabling this may allow external devices to view the user data, which could be a potential security concern.*
		When I disable the same setting
		Then I don't see the security alert anymore
