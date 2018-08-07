Feature: Guest find content item
  Guest find a specific content item using the search bar

  Background:
    Given I am on *user > sign in* page
      And I click *Continue as guest* button
      And There is a channel <channel> that contains videos and exercises
      And I am on *learn > classes page

  Scenario: Guest find a specific content item using the search bar
    When I fill in the search bar <search bar> with the item that I need to find
     And I click the *search icon* button
    Then I see the results of what I search

Examples:
  | search bar  |
  | early math  |