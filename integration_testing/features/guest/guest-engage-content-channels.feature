Feature: Guest engage content channels
  Guest engage with content on channels page

  Background:
    Given I am on *user > sign in* page
      And I click *Continue as guest* button
      And There is a channel <channel> that contains exercises
      And I am on *learn > classes page

  Scenario: Guest engage with content on channels page
    When I select <channel>
     And I am on *learn > topic* page
    Then I see all the contents of the <channel>

Examples:
  | channel      |
  | Khan Academy |