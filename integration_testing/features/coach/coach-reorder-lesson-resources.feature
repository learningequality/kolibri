Feature: Coach reorder lesson resources
   Coaches need to be able to (re)order the resources in a lesson according to their needs

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach > Lessons* page
      And I see the lesson <lesson_title>

  Scenario: Coach reorders the resources in the lesson
  When I click the lesson <lesson_title>
    Then I am on the <lesson_title> page
      And I see the list of resources included in the <lesson_title>
      And I see that each resource has *arrow up/down* buttons 
    When I click the *arrow down* button of a <resource> resource that I want to move below
    Then the snackbar notification appears
			And I see the resource move downward
    When I click the *arrow up* button of a <resource> resource that I want to move above
    Then the snackbar notification appears
      And I see the resource move upward

Examples:
| lesson_title   | resource          |
| Read the story | Night Trouble     |