Feature: Coach can add or remove bookmarked lesson resources

	Background:
    Given I am signed in as a coach user
    	And there is at least one channel imported on the device
    	And there is a class to which I am assigned as a coach
    	And I have created a lesson
    	And I have several bookmarked resources

	Scenario: Coach can add a bookmarked resource to a lesson
		When I go to the *Coach > <class> > Plan > <lesson>* page
			And I click the *Manage resources* button
		Then I see the *Manage lesson resources* page
			And I see the *Bookmarks* section above the *Search* field
		When I click on the *Bookmarks* section
		Then I see a list of my bookmarked resources with a checkbox for each one of them
		When I select a bookmarked resource via the checkbox
		Then I see a snackbar appear confirming the resource is added to my lesson
		When I click the *Close* button
		Then I am back at the *Coach > <class> > Plan > <lesson>* page
			And I can see that the selected bookmarked resource is added to the lesson resources

	Scenario: Coach can add multiple bookmarked resources to a lesson
		When I go to the *Coach > <class> > Plan > <lesson>* page
			And I click the *Manage resources* button
		Then I see the *Manage lesson resources* page
			And I see the *Bookmarks* section above the *Search* field
		When I click on the *Bookmarks* section
		Then I see a list of my bookmarked resources with a checkbox for each one of them
		When I select several bookmarked resource via the checkboxes
		Then I see a snackbar appear confirming that each resource is added to my lesson
		When I click the *Close* button
		Then I am back at the *Coach > <class> > Plan > <lesson>* page
			And I can see that the selected bookmarked resources have been added to the lesson resources

	Scenario: Coach can remove bookmarked resources from a lesson
		Given I have added bookmarked resources to a lesson
		When I go to the *Coach > <class> > Plan > <lesson>* page
			And I click the *Manage resources* button
		Then I see the *Manage lesson resources* page
			And I see the *Bookmarks* section above the *Search* field
		When I click on the *Bookmarks* section
		Then I see a list of my bookmarked resources
			And I see that the checkboxes of the already added to the lesson resources are checked
		When I uncheck some of the bookmarked resources
		Then I see a snackbar appear confirming that each resource is removed from my lesson
		When I click the *Close* button
		Then I am back at the *Coach > <class> > Plan > <lesson>* page
			And I can see that the deselected bookmarked resources have been removed from the lesson resources

Examples:
  | class     | lesson         |
  | 1st grade | Counting to 10 |
