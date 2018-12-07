Feature: Coach rename lesson
   Coaches need to be able to rename a lesson

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach > Lessons* page
      And I see the lesson <lesson_title>

  Scenario: Coach renames lesson
   When I click the lesson <lesson_title>
    Then I am on the <lesson_title> page
    When I click the *Options* button
    When I select *Edit details*
    Then I see the *Edit lesson details* modal
    When I rename the *Lesson title*
    When I click *Save* button
    Then the modal closes
      And the snackbar notification appears
      And I see the <lesson_title> is changed

Examples:
| lesson_title          |
| mathematics exercises |
