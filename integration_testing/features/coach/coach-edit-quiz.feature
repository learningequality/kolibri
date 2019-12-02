Feature: Coach edits quizzes
  Coach needs to be able to edit existing quiz details from both Plan and Report

  Background:
    Given I am signed in to Kolibri as a coach user
      And there is a quiz <quiz> created previously
      And I am on the *Coach - '<class>' > Plan > Quizzes > '<quiz>'* page
      And I see the quiz preview with the correct answers of the questions

  Scenario: Edit existing quiz title
      When I click the *Options* button
        And I select *Edit details*
      Then I see the *Edit quiz details* page
        And the title field is focused by default
      When I edit the quiz title and leave the field
        And I click *Save changes* button
      Then the page reloads
        And I see the title change on the quiz <quiz> preview page
        # And I see the snackbar notification *Changes to quiz saved*: No snackbar anymore?

  Scenario: Reassign quiz
    When I click the *Options* button
      And I select *Edit details*
    Then I see the full-page *Edit quiz details* modal
    When I change *Recipients* by selecting *Entire class* or one of the groups
      And I click *Save changes* button
    Then the page reloads
      # And the snackbar notification appears *Changes to quiz saved*: No snackbar anymore?
      And I see the change under *Recipients* in the quiz <quiz> preview page

  Background:
      Given I am at *Coach - '<class>' > Reports > Quizzes > '<quiz>'* page

  Scenario: Quizzes can be previewed from the report page
    When I click the *Options* dropdown menu
      And I select the *Preview* option
    Then I see a *Preview of quiz '<quiz>'* page
      And I see the list of <quiz> quiz questions
      And I see a preview for the first quiz question
    When I click the button for a different quiz question
      Then I see a preview for that other quiz question

  Scenario: Quiz details can be edited from the report page
    When I click the *Options* dropdown menu
      And I select the *Edit details* option
    Then I see a *Edit quiz details* page
      And I see form fields for editing the title and recipients (in that order)
    When I finish editing the details of the quiz
      And I click *Save changes* button
    Then I see the <quiz> report page again
    # No snackbar
      And I see the changes I made reflected in the report header


Examples:
| quiz        | description  |
| First quiz  | Fractions 1  |
