Feature: Coach review of class report per channel
    Coach needs to be able to review progress of the complete class for a particular channel in Kolibri

  Background:
    Given I am signed in to Kolibri as a facility coach
      And there is a class <class>
      And there is a channel <channel>

  Scenario: Review the progress of the whole class for a channel
    When I click the *Channels* tab
    Then I am on *Coach > Channel* page
      And I see all the channels <channel>
    When I click one particular channel <channel>
    Then I see a topics with two progress bar, the avg. exercises progress and avg. resource progress
    When I continue clicking the sub-topic <sub_topic>
    Then finally I see the full list of learners with their performances
      And I can review their answers' by clicking the name of learners

Examples:
| class     | channel            | sub_topic                      |
| Buffoons  | Khan Academy (fr)  | Ajouter des nombres jusqu'à 5  |
