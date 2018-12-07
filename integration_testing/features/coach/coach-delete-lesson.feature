Feature: Coach delete lesson
  Coach needs to be able to delete the lesson when necessary

  Background:
    Given I am signed in to kolibri as coach user
      And I am on *Coach > Lessons* page
      And I see the lesson <lesson_title>

  Scenario: Coach delete lesson
    When I click the lesson <lesson_title>
    Then I see the <lesson_title> lesson page
     When I click *Options* button
      And I select *Delete*
    Then I see the *Delete lesson* modal
    When I click *Delete* button
    Then the modal closes
      And the snackbar notification appears
      And I don't see the <lesson_title> on the list of *Lessons*

Examples:
| lesson_title          |
| mathematics exercises |
