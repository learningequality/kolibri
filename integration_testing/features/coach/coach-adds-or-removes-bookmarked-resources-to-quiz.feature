Feature: Coaches can select and use bookmarked resources in quiz creation

	Background:
    Given I am signed in as a coach user
    	And there is at least one channel imported on the device
    	And there is a class to which I am assigned as a coach
    	And I have created a lesson
    	And I have several bookmarked resources
    	And I am at *Create new quiz*
    	And I see the *Bookmarks* section above the *Search* field

	Scenario: Coach can add a bookmarked exercise to a quiz
		When I click on the *Bookmarks* section
		Then I see a list of my bookmarked exercises with a checkbox for each one of them
		When I select a bookmarked exercise via the checkbox
		Then I see a snackbar appear confirming the exercise is added to my quiz
		When I click the *Continue* button
		Then I am at the *Preview quiz* page
			And I can see that the selected bookmarked exercise is added to the quiz

	Scenario: Coach can add multiple bookmarked items to a quiz
		When I click on the *Bookmarks* section
		Then I see a list of my bookmarked exercises with a checkbox for each one of them
		When I select several bookmarked exercise via the checkbox
		Then I see a snackbar appear confirming that each selected exercise is added to my quiz
		When I click the *Continue* button
		Then I am at the *Preview quiz* page
			And I can see that the selected bookmarked exercises have been added to the quiz

	Scenario: Coaches add a bookmarked topic to a quiz # not implemented, do not test
		When I browse the new bookmarks content tree
			And I see a list of bookmarks consisting of only exercises and topics
			And I find and select a bookmarked topic via the checkbox
		Then I see a snackbar appear confirming the topic was selected
