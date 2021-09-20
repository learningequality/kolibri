Feature: Coaches can bookmark resources and topics

	Scenario: Coaches can bookmark resources while in the *Learn* tab
		Given that I am on the *Learn* tab
			And I navigate to a resource
		When I click bookmark icon on the resource card
		Then I see a snackbar confirming the resource was bookmarked
			And the resource is added to my list of bookmarks

	Scenario: Coaches can bookmark topics while in the *Learn* tab
		Given that I am on the *Learn* tab
			And I navigate to a topic
		When I click bookmark icon near the topic title
		Then I see a snackbar confirming the topic was bookmarked
			And the topic is added to my list of bookmarks

	Scenario: Coaches can bookmark resources while in quiz creation flow
		Given that I am creating a quiz
			And I navigate to a list of exercises and topics
		When I click bookmark icon on the exercise or topic card
		Then I see a snackbar confirming the resource or topic was bookmarked
			And the resource or topic is added to my list of bookmarks

	Scenario: Coaches can bookmark resources while in lesson resource management flow
		Given that I have created a lesson
			And I am adding resources to my lesson
			And I see a list of available resources to add
		When I click bookmark icon on a resource or topic card
		Then I see a snackbar confirming the resource or topic was bookmarked
			And the resource or topic is added to my list of bookmarks
