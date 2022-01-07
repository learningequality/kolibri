Feature: Learners can bookmark resources

	Background:
    Given I am signed in as a learner user
    	And there is at least one channel imported on the device

	Scenario: Learners can bookmark resources
		When I navigate to a resource
			And I select the bookmark icon of the resource
		Then I see the color of the icon changed to black indicating that the resource was bookmarked
		When I go to the *Learn > Bookmarks* page
		Then I can see that the resource is added to my list of bookmarks

	Scenario: Learners can remove bookmarks while viewing a resource
		When I navigate to a bookmarked resource
			And I select the bookmark icon of the resource
		Then I see the color of the icon changed to white indicating that the resource was removed
			And the resource disappears from my bookmarks list

	Scenario: Learners can remove bookmarks from the *Learn > Bookmarks* page
		When I go to the *Learn > Bookmarks* page
			And I select the *Remove from bookmarks* icon of a bookmarked resource
		Then I see a snackbar confirming that the resource was removed
		When I go to the *Learn > Bookmarks* page
		Then I can see that the resource is no longer displayed in my bookmarks list

	Scenario: Learners can view information for a bookmarked resource
		When I go to the *Learn > Bookmarks* page
			And I select the *i* icon on the resource card
		Then I see a sidebar with more information about the resource
