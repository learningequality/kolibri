Feature: Super admin automatic syncing

  Background:
    Given I am signed in as a super admin

	Scenario: Super admin does not have enough storage for new automatic downloads
		Given I don't have enough storage on my device
		When I interact with the application #TODO: when exactly is the notification being displayed
		Then I see the following notification: *You do not have enough storage for updates.*
