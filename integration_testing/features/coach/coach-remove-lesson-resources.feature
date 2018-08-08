Feature: Coach remove lesson resources
   Coaches need to be able to delete resources in a lesson according to their needs

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach > Lessons* page
      And I see the lesson <lesson_title>


  Scenario: Coach deletes resource(s) in the lesson
     When I click the lesson <lesson_title>
    Then I am on the <lesson_title> page
      And I see the list of resources with lot of <topic> topic and *Remove* button in the right side
    When I click the *Remove* button on one particular topic that I want to delete
    Then the snackbar notification appears
			And I don't see the <topic> on the list of resources

Examples:
| lesson_title          | topic         |
|  Read the story       | Night Trouble |
