Feature: Coach renames quiz
   Coaches need to be able to rename quizzes

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach > Plan > Quizzes* page
      And I see the quiz <quiz_title>

  Scenario: Coach renames quiz
    When I click the quiz <quiz_title>
    # Is this going to be re-implemented, or this can be achived just through the *Edit details* option?
    Then I am on the <quiz_title> page
    When I click the *Options* button
    When I select *Edit details*
    Then I see the *Edit quiz details* modal
    When I rename the quiz *Title*
    When I click *Save* button
    Then the modal closes
      And the snackbar notification appears
      And I see the <quiz_title> is changed

Examples:
| quiz_title            |
| mathematics exercises |


#Checks