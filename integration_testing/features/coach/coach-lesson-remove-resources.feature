Feature: Coach removes lesson resources
   Coaches need to be able to delete resources in a lesson according to their needs

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach > Plan > Lessons* page
      And there is a lesson <lesson>

  Scenario: Delete resource in the lesson
    When I click the lesson <lesson>
    Then I am on the <lesson> page
      And I see the list of resources
      And I see *Remove* button for each resource
    When I click the *Remove* button for <resource> resource
    Then the snackbar notification appears
      And I don't see the <resource> on the list of resources anymore

Examples:
| lesson         | resource            |
| Read the story | Recognize fractions |
