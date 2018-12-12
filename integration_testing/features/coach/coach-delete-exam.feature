Feature: Coach delete quiz
  Coach needs to be able to delete the quiz when necessary

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach > Quizzes* page

  Scenario: Delete quiz
    When I click the quiz <exam_name>
    Then I see the <exam_name> page
    When I click *Options* button
      And I select *Delete*
    Then I see the *Delete quiz* modal
    When I click *Delete* button
    Then the modal closes
      And the snackbar notification appears
      And I don't see the <exam_name> on the list of *Quizzes*

Examples:
| exam_name                           |
| Frist Quarter English Examination   |
