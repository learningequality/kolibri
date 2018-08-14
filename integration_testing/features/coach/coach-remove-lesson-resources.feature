Feature: Coach remove lesson resources
   Coaches need to be able to delete resources in a lesson according to their needs

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach > Lessons* page
      And I see a lesson <lesson>

  Scenario: Delete resource in the lesson
    When I click the lesson <lesson>
    Then I am on the <lesson> page
      And I see the list of lesson <lesson> resources 
      And I see *Remove* button for each resource
    When I click the *Remove* button for one resource
    Then the snackbar notification appears
			And I don't see the <topic> on the list of resources

Examples:
| lesson         |
| Read the story |
