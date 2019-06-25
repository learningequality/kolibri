Feature: Coach deletes quiz
  Coach needs to be able to delete the quiz when necessary

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach - '<class>' > Plan > Quizzes* page

  Scenario: Delete quiz
    When I click the quiz <quiz>
    Then I see the <quiz> page
    When I click *Options* button
      And I select *Delete*
    Then I see the *Delete quiz* modal
    When I click *Delete* button
    Then the modal closes
      And I see the snackbar notification
      And I don't see the <quiz> on the list of *Quizzes*

Examples:
| quiz                              |
| First Quarter English Examination |
