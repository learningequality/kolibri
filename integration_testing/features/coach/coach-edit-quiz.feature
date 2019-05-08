Feature: Coach edits quizzes
  Coach needs to be able to edit existing quizzes

  Background:
    Given I am signed in to Kolibri as a coach user
      And there is a quiz <quiz> created previously
      And I am on the *Coach > Plan > Quizzes > '<quiz>'* page
      And I see the quiz preview with the correct answers of the questions

  Scenario: Edit existing quiz title
      When I click the *Options* button
        And I select *Edit details*
      Then I see the full-page *Edit quiz details for '<quiz>'* modal
        And the title field should be focused by default
      When I edit the quiz title and leave the field
        And I click *Save changes* button
      Then the modal closes
        And I see the title change
        # And I see the snackbar notification *Changes to quiz saved*: No snackbar anymore?

  Scenario: Edit existing quiz status
      When I click the *Options* button
        And I select *Edit details*
      Then I see the full-page *Edit quiz details for '<quiz>'* modal
      When I edit the quiz status
        And I click *Save changes* button
      Then the modal closes
        And I see the status change in the <quiz> page
        # And I see the snackbar notification “Quiz changes saved”: No snackbar anymore?   

  Scenario: Reassign quiz
    When I click the *Options* button
      And I select *Edit details*
    Then I see the full-page *Edit quiz details for '<quiz>'* modal
    When I change *Recipients* by selecting *Entire class* or one of the groups
      And I click *Save changes* button
    Then the modal closes
      # And the snackbar notification appears *Changes to quiz saved*: No snackbar anymore? 
      And I see the change under *Recipients*

Examples:
| title       | description  |
| First quiz  | Fractions 1  |
