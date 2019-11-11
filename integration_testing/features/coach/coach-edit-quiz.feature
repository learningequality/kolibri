Feature: Coach edits quizzes
  Coach needs to be able to edit existing quizzes

  Background:
    Given I am signed in to Kolibri as a coach user
      And there is a quiz <quiz> created previously
      And I am on the *Coach - '<class>' > Plan > Quizzes > '<quiz>'* page
      And I see the quiz preview with the correct answers of the questions

  Scenario: Edit existing quiz title
      When I click the *Options* button
        And I select *Edit details*
      Then I see the *Edit quiz details for '<quiz>'* page
        And the title field is focused by default
      When I edit the quiz title and leave the field
        And I click *Save changes* button
      Then the page reloads
        And I see the title change on the quiz <quiz> preview page
        # And I see the snackbar notification *Changes to quiz saved*: No snackbar anymore?

  Scenario: Reassign quiz
    When I click the *Options* button
      And I select *Edit details*
    Then I see the full-page *Edit quiz details for '<quiz>'* modal
    When I change *Recipients* by selecting *Entire class* or one of the groups
      And I click *Save changes* button
    Then the page reloads
      # And the snackbar notification appears *Changes to quiz saved*: No snackbar anymore?
      And I see the change under *Recipients* in the quiz <quiz> preview page

Examples:
| quiz        | description  |
| First quiz  | Fractions 1  |
