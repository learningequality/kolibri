Feature: Coach deletes quiz
  Coach needs to be able to delete the quiz when necessary

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach > Plan > Quizzes* page

  Scenario: Delete quiz
    When I click the quiz <quiz_name>
    Then I see the <quiz_name> page
    When I click *Options* button
      And I select *Delete*
    Then I see the *Delete quiz* modal
    When I click *Delete* button
    Then the modal closes
      And I see the snackbar notification
      And I don't see the <quiz_name> on the list of *Quizzes*

Examples:
| quiz_name                           |
| Frist Quarter English Examination   |
