Feature: Coach can bookmark resources and topics

	Background:
    Given I am signed in as a coach user
    	And there is at least one channel imported on the device

	Scenario: Coach can bookmark resources
		When I navigate to a resource
			And I select the bookmark icon of the resource
		Then I see the color of the icon changed to black indicating that the resource was bookmarked
		When I go to the *Learn > Bookmarks* page
		Then I can see that the resource is added to my list of bookmarks

	Scenario: Coach can remove bookmarks while viewing a resource
		When I navigate to a bookmarked resource
			And I select the bookmark icon of the resource
		Then I see the color of the icon changed to white indicating that the resource was removed
			And the resource disappears from my bookmarks list

	Scenario: Coach can remove bookmarks from the *Learn > Bookmarks* page
		When I go to the *Learn > Bookmarks* page
			And I select the *Remove from bookmarks* icon of a bookmarked resource
		Then I see a snackbar confirming that the resource was removed
		When I go to the *Learn > Bookmarks* page
		Then I can see that the resource is no longer displayed in my bookmarks list

	Scenario: Coach can view information for a bookmarked resource
		When I go to the *Learn > Bookmarks* page
			And I select the *i* icon on the resource card
		Then I see a sidebar with more information about the resource

	Scenario: Coaches can bookmark resources while in quiz creation flow #not yet implemented, do not test
		Given that I am creating a quiz
			And I navigate to a list of exercises and topics
		When I click bookmark icon on the exercise or topic card
		Then I see a snackbar confirming the resource or topic was bookmarked
			And the resource or topic is added to my list of bookmarks

	Scenario: Coaches can bookmark resources while in lesson resource management flow #not yet implemented, do not test
		Given that I have created a lesson
			And I am adding resources to my lesson
			And I see a list of available resources to add
		When I click bookmark icon on a resource or topic card
		Then I see a snackbar confirming the resource or topic was bookmarked
			And the resource or topic is added to my list of bookmarks
