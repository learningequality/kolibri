Feature: Coach reorders lesson resources
   Coaches need to be able to (re)order the resources in a lesson according to their needs

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach > Plan > Lessons* page
      And I see the lesson <lesson_title>

  Scenario: Reorder resources in the lesson by mouse drag and drop
    When I click the lesson <lesson_title>
      Then I am on the *Manage resources in '<lesson_title>'* page
        And I see the list of resources included in the <lesson_title>
      When I move the cursor over a resource
      Then it transforms to a hand
      When I drag and drop the resource up or down 
      Then the snackbar notification appears
        And I see the resource in the new position

  Scenario: Reorder resources in the lesson by keyboard
    When I click the lesson <lesson_title>
      Then I am on the <lesson_title> page
        And I see the list of resources included in the <lesson_title>
      When I use the TAB key to focus the resource 
      Then I see the focus ring around either up or down arrow
      When I press the ENTER or SPACEBAR key  
      Then the snackbar notification appears
        And I see the resource in the new position

  Scenario: Cancel lesson editing
    Given that I haven’t made any changes on *Manage resources in '<lesson_title>'* page
      When I click on the *X* to close the *Manage resources in '<lesson_title>'* page
      Then I am back on the <lesson_title> summary under the *Lessons* tab

Examples:
| lesson_title   | resource          |
| Read the story | Night Trouble     |