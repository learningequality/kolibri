Feature: Coaches can select and use bookmarked resources in quiz creation

	Background:
    Given I am signed in as a coach user
    	And there is at least one channel imported on the device
    	And there is a class to which I am assigned as a coach
    	And I have created a lesson
    	And I have several bookmarked resources
    	And I am at *Create new quiz*
    	And I see the *Bookmarks* section above the *Search* field

	Scenario: Coach can add a bookmarked resource to a quiz
		When I click on the *Bookmarks* section
		Then I see a list of my bookmarked resources with a checkbox for each one of them
		When I select a bookmarked resource via the checkbox
		Then I see a snackbar appear confirming the resource is added to my quiz
		When I click the *Continue* button
		Then I am at the *Preview quiz* page
			And I see that the selected bookmarked resource is added to the quiz

	Scenario: Coach can add multiple bookmarked resources to a quiz
		When I click on the *Bookmarks* section
		Then I see a list of my bookmarked resources with a checkbox for each one of them
		When I select several bookmarked resource via the checkbox
		Then I see a snackbar appear confirming that each selected resource is added to my quiz
		When I click the *Continue* button
		Then I am at the *Preview quiz* page
			And I see that the selected bookmarked resources have been added to the quiz

	Scenario: Coach changes the added bookmarked resources to a quiz
		Given I've already added at least one bookmarked resource to a quiz
			And I am at the *Preview quiz* page
		When I click the *Previous step* button
		Then I am at the *Create new quiz* page
		When I uncheck a checked bookmarked resource
		Then I see a snackbar appear confirming that the selected resource is removed from my quiz
		When I select another bookmarked resource via the checkbox
		Then I see a snackbar appear confirming the resource is added to my quiz
		When I click the *Continue* button
		Then I am at the *Preview quiz* page
			And I see that the selected bookmarked resource is added to the quiz

	Scenario: Coaches add a bookmarked topic to a quiz # not implemented, do not test
		When I browse the new bookmarks content tree
			And I see a list of bookmarks consisting of only resources and topics
			And I find and select a bookmarked topic via the checkbox
		Then I see a snackbar appear confirming the topic was selected
