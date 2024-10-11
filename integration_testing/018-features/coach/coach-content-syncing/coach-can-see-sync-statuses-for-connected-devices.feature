Feature: Coaches can see sync statuses for connected devices

	Background:
    Given I am signed in as a coach user
    	And there is at least one channel imported on the device
    	And there is a class to which I am assigned as a coach
    	And I have created a lesson and a quiz
    	And there are Learn-only devices which are connected to the classroom server
    	And learners registered to my class have completed a lesson and a quiz

	Scenario: Coach can see the sync statuses of the learners from the *Class home* page
		When I go to *Coach > <class> Class home*
			And I click the *View learners* hyperlink
		Then I see the *Learners in '<class>'* table with all devices connected to the classroom server
			And I see the sync statuses of every connected device

	Scenario: Coach can see the sync statuses of the learners from the *Reports* page
		When I go to *Coach > <class> Reports*
			And I click the *View learner devices* hyperlink
		Then I see the *Learners in '<class>'* table with all devices connected to the classroom server
			And I see the sync statuses of every connected device

	Scenario: Coaches can see more information regarding sync statuses
		Given I am at the *Learners in '<class>'* page
		When I click the *Information about sync statuses* hyperlink
		Then I see a modal giving me information on each individual sync status
