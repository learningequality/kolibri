Feature: Coach reorders lesson resources
   Coaches need to be able to (re)order the resources in a lesson according to their needs

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach - '<class>' > Plan > Lessons* page
      And I see the lesson <lesson>

  Scenario: Reorder resources in the lesson by mouse drag and drop
    When I click the lesson <lesson>
      Then I am on the *Manage resources in '<lesson>'* page
        And I see the list of resources included in the <lesson>
      When I move the cursor over a resource
      Then it transforms to a hand
      When I drag and drop the resource up or down 
      Then the snackbar notification appears
        And I see the resource in the new position

  Scenario: Reorder resources in the lesson by keyboard
    When I click the lesson <lesson>
      Then I am on the <lesson> page
        And I see the list of resources included in the <lesson>
      When I use the TAB key to focus the resource 
      Then I see the focus ring around either up or down arrow
      When I press the ENTER or SPACEBAR key  
      Then the snackbar notification appears
        And I see the resource in the new position

  Scenario: Cancel lesson editing
    Given that I haven’t made any changes on *Manage resources in '<lesson>'* page
      When I click on the *X* to close the *Manage resources in '<lesson>'* page
      Then I am back on the lesson <lesson> page

Examples:
| lesson         | resource          |
| Read the story | Night Trouble     |
