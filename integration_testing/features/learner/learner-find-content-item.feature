Feature: Learner find content item
  Learner find a specific content item using the search bar

  Background:
    Given I am signed in to Kolibri as a Learner user
      And There is a channel <channel> that contains video and exercises
      And I am on *Learn > Classes page

  Scenario: Learner find a specific content item using the search bar
    When I fill in the search bar <search bar> with the item that I need to find
     And I click the *Search icon* button
    Then I see the results of what I search

Examples:
  | search bar  |
  | early math  |