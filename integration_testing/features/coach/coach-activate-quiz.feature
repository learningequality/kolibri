Feature: Coach activates quizzes
  Coaches need to activate quizzes in order for learners to gain access and start submitting them

  Background:
    Given I am signed in to kolibri as coach user
      And I am on *Coach > Plan > Quizzes* page
      And I see the quiz <quiz_title>

  Scenario: Change the quiz status to *Active*
    When I click the quiz <quiz_title>
    # Is this going to be re-implemented, or this can be achived just through the *Edit details* option?
    Then I see the <quiz_title> quiz page
      And I see the quiz *Status* is *Inactive*
    When I click *Change*
    Then I see the *Change quiz status* modal
    When I select *Active*
      And I click *Save* button
    Then the modal closes
      And I see the snackbar notification *Changes to quiz saved*
      And I see the quiz *Status* is *Active*

  Scenario: Change the quiz status to *Inactive*
    When I click the quiz <quiz_title>
    Then I see the <quiz_title> quiz page
      And I see the quiz *Status* is *Active*
    When I click *Change*
    Then I see the *Change quiz status* modal
    When I select *Inactive*
      And I click *Save* button
    Then the modal closes
      And I see the snackbar notification *Changes to quiz saved*
      And I see the quiz *Status* is *Inactive*

Examples:
| quiz_title     |
| First quarter  |
