Feature: Coaches can see sync statuses for connected devices via a quiz coach report

	Scenario: Coaches can see sync statuses
		Given I am on a quiz report
		When I press the *View learner devices* hyperlink
		Then I see a table with all devices connected to the classroom server
			And I see the sync statuses of every connected device
