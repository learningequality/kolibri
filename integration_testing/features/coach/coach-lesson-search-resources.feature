Feature: Coach lesson resource search
  Coach needs to be able to search contents when creating lessons

  Background:
    Given I am signed into Kolibri as a coach user
      And I am on the *Coach - '<class>' > Plan > Lessons > '<lesson>' > Manage resources* page

    Scenario: Search from browse mode (with results)
      Given I am browsing the topics
      When I enter <searchterm> in the *Search* field
        And I press the *Submit search* button (magnifying glass)
      Then I see the *Results for '<searchterm>'* header
        And I see the search results for <searchterm>
        And I see the search filters
        And I see the *Exit search* button
        
    Scenario: Search again from search results page
      Given I am on the *Results for '<searchterm>'* page
      When I enter a <searchterm2> in the *Search* textbox
        And I press the *Submit search* button (magnifying glass)
      Then the previous search results disappear
        And I see the results for the <searchterm2>

    Scenario: Exit search with no browser history
      Given I am on the *Results for '<searchterm>'* page
        And I arrived to this page directly from a URL
      When I press the *Exit search* button
      Then I return to the listing of channels

    Scenario: Exit search with browser history
      Given I am on the *Results for '<searchterm>'* page
        And I arrived to this page directly from a topic
      When I press the *Exit search* button
      Then I return to the the content listing of the last topic

    Scenario: Search has no results
      Given I am on the *Results for '<searchterm>'* page
        And There are no results for <searchterm>
      Then I see a message saying *No results for '<searchterm>'*
        And I don't see available options in search filters

    Scenario: Search results can be filtered
      Given I am on the *Results for '<searchterm>'* page
        And the search results for <searchterm> have different role visibility, channels, and content kinds
        And all the filters are in default *All* option
        And the *Type* filter has options for each of the content kinds
        And the *Channel* filter has options for each of the channels
        And the *Show* filter has options for each of the roles


Examples:
| searchterm | searchterm2 |
| food       | silliness   |
