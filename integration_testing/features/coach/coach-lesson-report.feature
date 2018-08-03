Feature: Coach lesson report
  Coach needs to be able to see the lesson report details

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on the *Coach > lessons* page
      And I see the lesson <lesson_title>

  Scenario: Coach can view the lesson report details
    When I click the lesson <lesson_title>
    Then I am on the <lesson_title> page
      And below I see all the topic <topic>
    When I click <topic>
    Then I am on the *lesson report details* page
      And I see all the report of learners progress

Examples:
| lesson_title   | topic         |
| lesson one     | Night Trouble |
