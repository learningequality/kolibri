Feature: Coach reorder lesson resources
   Coaches need to be able to (re)order the resources in a lesson according to their needs

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach > Lessons* page
      And I see the lesson <lesson_title>

  Scenario: Coach reorders the resources in the lesson
  When I click the lesson <lesson_title>
    Then I am on the <lesson_title> page
      And I see the list of resources with lot of <topic> topic and *Arrow up/down* button in left side
    When I click the *Arrow down* button in one particular topic that I want to move
    Then the snackbar notification appears
			And I see the topic move downward
      And I continue clicking to arrange the topic

Examples:
| lesson_title          | topic             |
|  Read the story       | Night Trouble     |
|                       | Student Handbook  |
