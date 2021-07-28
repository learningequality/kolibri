Feature: Coaches can see helpful information explaining sync statuses

	Scenario: Coaches can see more information regarding sync statuses
		Given I see all learner device sync statuses
		When I press the *Information about sync statuses* hyperlink
		Then I see a modal giving me information on each individual sync status
