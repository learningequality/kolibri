Feature: Custom channels representation

	Scenario: Exploring a custom channel
		Given Custom channels is enabled as an options flag in the Learn plugin
		When The learner clicks on the card for the custom channel
		Then The URL goes to #/topics/<topic_id> and displays a full page HTML5 app

	Scenario: Exploring a disabled custom channel
		Given Custom channels is disbled as an options flag in the Learn plugin
		When The learner clicks on the card for the custom channel
		Then The URL goes to #/topics/<topic_id> and displays the Kolibri topic interface

	Scenario: Navigating in a custom channel
		Given The learner has started exploring a custom channel
		When The learner clicks on a topic in the custom navigation
		And The HTML5 app displays the contents of the topic
		Then The URL updates with new context and stays on the full page HTML5 app

	Scenario: Showing resources in a custom channel
		Given The learner has started exploring a custom channel
		When The learner clicks on a resource in the custom navigation
		Then An overlay showing the content displays over the full page HTML5 app
		And The URL updates with new context
		And The full page HTML5 app remains in the background

	Scenario: User closing shown resources in a custom channel
		Given The learner has opened a resource from within a custom channel
		When The learner clicks close on the overlay
		Then The URL updates with new context
		And The overlay closes
		And The full page HTML5 app is still displayed

	Scenario: Custom nav closing shown resources in a custom channel
		Given The learner has opened a resource from within a custom channel
		When The custom nav app says the overlay should close
		Then The URL updates with new context
		And The overlay closes
		And The full page HTML5 app is still displayed

	Scenario: Navigating out of a custom channel
		Given The learner has started exploring a custom channel
		When The learner clicks on a link in the custom navigation
		And The link is to a topic
		Then The URL goes to #/topics/t/<topic_id> and displays the Kolibri topic interface
		And The full page HTML5 app closes
