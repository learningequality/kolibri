Feature: Coaches can see sync statuses for the devices connected to their classroom server via the coach dashboard

	Given that I am on the *Coach* tab
		And I am on the *Coach dashboard* page
		And there are learners registered to the class
		And there are devices connected to the classroom server

	Scenario: Coaches see all connected learner devices and their sync statuses
		When I press the *View learners* button
		Then I see a table with all devices connected to the classroom server
			And I see the sync statuses of every connected device
			And I can sort the devices by username or full name
