Feature: Coach edits quizzes
  Coach needs to be able to edit existing quizzes

  Background:
    Given I am signed in to Kolibri as a coach user
      And I am on the *Coach > Plan > Quizzes* page

  Scenario: Edit existing quiz title
    Given there is a quiz <quiz> created previously
      When I click the *Options* button
        And I select *Edit details*
      Then I see the *Edit quiz details* modal
        And the title field should be focused by default
      When I edit the quiz title and leave the field
        And I click *Save* button
      Then the modal closes
        And I see the title change under the *quiz* tab
        And I see the snackbar notification *Changes to quiz saved*

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
| title       | description  |
| First quiz  | Fractions 1  |
