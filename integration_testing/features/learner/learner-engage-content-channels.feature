Feature: Learner engage content channels
  Learner engage with content on channels page

  Background:
    Given I am signed in to Kolibri as a Learner user
      And There is a channel <channel> and topic <topic> that contains exercises
      And I am on *learn > classes* page

  Scenario: Learner engage with content on channels page
    When I click *Channels* button
    Then I see <channel> list
    When I select <channel>
     And I am on *learn > topic* page
    Then I see all the contents of the <channel>

Examples:
  | channel      |
  | Khan Academy |