Feature: Access Kolibri app server remotely
	Users accessing Kolibri app server remotely need to have the same sign in experience

	Background:
		Given that the remote access to Kolibri is enabled

	Scenario: Sign in directly after entering the username
		Given that the signing in without password is enabled in *Facility > Settings*
		When I try to access the Kolibri server app from a browser on an external device

		# You don't need to be in an external device: use an incongnito window, or any other browser where the cookie for the App user is not set

		Then I see the sign in page with just the username input feild
			And I type my username
			And I click or tap *Sign in*
		Then I see my Kolibri account

	Scenario: Sign in after entering the username and the password
	 	Given that the signing in without password is disabled in *Facility > Settings*
		When I try to access the Kolibri server app from a browser on an external device
		Then I see the sign in page with only the username input field
		When I type my username
			And I click or tap *Sign in*
		Then I see an input field to type my password
		When I type my password
			And I click or tap *Continue*
		Then I see my Kolibri account
