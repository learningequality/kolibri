Feature: Learner interacts with the View lesson resources side panel
  By opening the side panel a learner user can see content from the current lesson and the progress made
	for each item

  Background:
    Given I am signed in as a learner user
			And I am at *Learn > Home > Classes > '<class>'* page
			And there is a <lesson> lesson assigned to me, with several resources

  Scenario: Learner opens the side panel and selects another resource
    When I click on a content card
    Then I see the <content_item> page
    When I click the *View lesson resources* icon
    Then I see the icons and titles of the available lesson resources listed in the side panel
    When I click on a title
    Then I see the <content_item> page for the selected resource

  Scenario: Learner opens the side panel and views the progress status of an item
  	Given I have several completed and in progress resources
  		And I am on a <content_item> page
  	When I click the *View lesson resources* icon
    Then I see the icons and titles of the available lesson resources listed in the side panel
    	And I see a yellow start icon next to the completed resources
    	And I see a progress bar icon next to the in progress resources

  Examples:
  | class     | content_item  |
  | Test Class  | Intro to addition |
