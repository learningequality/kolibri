Feature: Learners can see different device syncing statuses

	Given that the learner device is able to be synced to the classroom server
		And I am under the *Learn* tab
		And there is information available to sync

	Scenario: Learners can see device syncing statuses
		When the learner device is attempting to sync to the classroom server
			And I open the user menu in the top appbar
		Then I see a *device status* indicator showing the device is syncing
		When the learner device has successfully synced
			And I open the user menu in the top appbar
		Then I see a *device status* indicator showing the device has synced a number of minutes ago

	Scenario: Learners can see errors associated with device syncing
		When the learner device is unable to sync with the classroom server
			And I open the user menu in the top appbar
		Then I see a *device status* red error indicator showing the device is not recently synced
		When the learner device has successfully synced in the past but is unable to currently sync
			And I open the user menu in the top appbar
		Then I see a *device status* red error indicator showing the device has synced a number of minutes ago

	Scenario: Learners can see that the device is not connected to the classroom server
		When the learner device is not connected to the classroom server
			And I open the user menu in the top appbar
		Then I see a *device status* indicator showing the device is not connected
