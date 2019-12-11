Feature: Coach manages lesson resources
   Coaches need to be able to manage (add more, re-order and remove) the resources in a lesson according to their needs

  Background:
    Given I am signed in to Kolibri as coach user
      And there is a lesson <lesson> created with some resources already added
      And I am on *Coach - '<class>' > Plan > Lessons > '<lesson>'* page

  Scenario: Add or remove resources
    When I click the *Manage resources* button
    Then I am on the *Manage resources in '<lesson>'* page
      And I see the *N resources in this lesson* info
      And I can add and remove resources same as during lesson creation

  Scenario: Exit without changes
    Given that I haven’t made any changes on *Manage resources in '<lesson>'* page
      When I click on the *X* to close the *Manage resources in '<lesson>'* page
        OR I click *Finish* button
      Then I am back on the lesson <lesson> page      

  Scenario: Reorder resources in the lesson by mouse drag and drop
    When I move the cursor over a resource under the *Resources* heading
    Then it transforms to a hand
    When I drag and drop the resource up or down 
    Then the snackbar notification appears
      And I see the resource in the new position

  Scenario: Reorder resources in the lesson by keyboard
    When I use the TAB key to focus the resource 
    Then I see the focus ring around either up or down arrow
    When I press the ENTER or SPACEBAR key  
    Then the snackbar notification appears
      And I see the resource in the new position

  Scenario: Remove lesson resources
    When I click the *Remove* button for <resource> resource
    Then the snackbar notification appears
      And I don't see the <resource> on the list of resources anymore

Examples:
| lesson         | resource          |
| Read the story | Night Trouble     |
