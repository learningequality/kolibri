Feature: Coach reassigns quizzes
  Coach needs to be able to reassign quizzes to group(s) or entire class

  Background:
    Given there are 2 or more learner groups
      And I am signed in to Kolibri as a coach user
      And I am on the *Coach > Plan > Quizzes* page
      And I see the quiz <quiz>

  Scenario: Reassign quiz
    When I click *Options* button
      And I select *Edit details*
    Then I see the *Edit quiz details* modal
    When I change *Visible to* by selecting *Entire class* or one of the groups
      And I click *Save* button
    Then the modal closes
      And the snackbar notification appears *Changes to quiz saved*
      And I see the change under *Visible to*

Examples:
| quiz        |
| Mathematics |
