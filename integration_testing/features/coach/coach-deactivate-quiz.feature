Feature: Coach deactivates quizzes
  Coaches need to make quizzes inactive when the submission period is over

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach > Plan > Quizzes* page
      And I see the quiz <quiz_title>

  Scenario: Change the quiz status to *Inactive*
    When I click the quiz <quiz_title>
    Then I see the <quiz_title> quiz page
      And I see the quiz *Status* is *Active*
    When I click *Change*
    Then I see the *Change quiz status* modal
    When I select *Inactive*
      And I click *Save* button
    Then the modal closes
      And I see the quiz *Status* is *Inactive*

Examples:
| quiz_title     |
| First quarter  |
