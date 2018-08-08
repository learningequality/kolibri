Feature: Guest engage content channels
  Guest engage with content on channels page

  Background:
    Given I am on *User > Sign in* page
      And I click *Continue as guest* button
      And There is a channel <channel> that contains exercises
      And I am on *Learn > Topic* page

  Scenario: Guest engage with content on channels page
    When I select channel <channel>
     And I am on *Learn > Topic > channels* page
    Then I see all the contents of the channel <channel>

Examples:
  | channel      |
  | Khan Academy |