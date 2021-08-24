Feature: Learners can bookmark resources and topics

	Scenario: Learners can bookmark resources in the *Learn* tab
		Given that I am on the *Learn* tab
			And I navigate to a resource in the channels tab
		When I click bookmark icon on the resource card
		Then I see a snackbar confirming the resource was bookmarked
			And the resource is added to my list of bookmarks

	Scenario: Learners can bookmark topics in the Learn tab
		Given that I am on the *Learn* tab
			And I navigate to a topic in the channels tab
		When I click bookmark icon near the topic title
		Then I see a snackbar confirming the topic was bookmarked
			And the topic is added to my list of bookmarks

	Scenario: Learners can remove bookmarks
		Given that I am on the bookmarks page
			And I navigate to a resource or topic I want to remove
		When I click removal icon on the exercise or topic card
		Then I see a snackbar confirming the resource or topic was removed
			And the resource or topic disappears from my bookmarks list

	Scenario: Learners can navigate to a bookmarked topic's location
		Given that I am on the bookmarks page
			And I navigate to a topic that I want its location revealed
		When I click on the topic card
		Then I am on the topic location in the *Channels* tab

	Scenario: Learners can navigate to a bookmarked resource's location
		Given that I am on the bookmarks page
			And I navigate to a resource that I want its location revealed
		When I click on the resource card
		Then I am on the topic location in the *Channels* tab for that particular resource

	Scenario: Learners can preview a bookmarked resource
		Given that I am on the bookmarks page
			And I navigate to a resource I want to preview
		When I click information icon on the resource card
		Then I see a sidebar with more information about the resource
