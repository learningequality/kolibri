Feature: Class coach view
    Class coaches need to be able to review the progress in class(es) they are assigned to, but not other classes in the facility.

  Background:
    Given I am signed in to Kolibri as a class coach user
    And there is a class <class>
    And there is a channel <channel>

    Scenario: Class coach can review the one particular learner
    Given I am on the *Coach > learner* page
    When I click one particular learner's name
    Then I see a all channels
    When I click one particular channel <channel>
    Then I see a topics with two progress bar, the avg. exercises progress and avg. resource progress
    When I continue clicking the sub-topic <sub_topic>
    Then finally I see the performances achieve by the learner

    Scenario: Class coach can review the all performances of learners
    Given I am on the *Coach > Channel* page
    When I click one particular channel <channel>
    Then I see a topics with two progress bar, the avg. exercises progress and avg. resource progress
    When I continue clicking the sub-topic <sub_topic>
    Then finally I see the full list of learners with their performances


Examples:
| class     | channel                                | sub_topic              |
| Buffoons  | Global Digital Library - Book Catalog  | Chicken And Millipede  |
