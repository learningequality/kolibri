Feature: Coach activates quizzes
  Coaches need to activate quizzes in order for learners to gain access and start submitting them

  Background:
    Given I am signed in to kolibri as coach user
      And I am on *Coach > Plan > Quizzes* page
      And I see the quiz <quiz_title>

  Scenario: Change the quiz status to *Active*
    Given that quiz <quiz_title> *Status* is *Inactive*
      When I click the *Options* button
        And I select *Edit details*
      Then I see the *Edit quiz details* modal
      When I select *Active* under *Status*
      And I click *Save* button
    Then the modal closes
      And I see the snackbar notification *Changes to quiz saved*
      And I see the quiz *Status* is *Active*

  Scenario: Change the quiz status to *Inactive*
    Given that quiz <quiz_title> *Status* is *Active*
      When I click the *Options* button
        And I select *Edit details*
      Then I see the *Edit quiz details* modal
      When I select *Inactive* under *Status*
      And I click *Save* button
    Then the modal closes
      And I see the snackbar notification *Changes to quiz saved*
      And I see the quiz *Status* is *Inactive*

Examples:
| quiz_title     |
| First quarter  |
