Feature: Coach manages lesson resources
   Coaches need to be able to manage (add more, re-order and remove) the resources in a lesson according to their needs

  Background:
    Given I am signed in to Kolibri as a coach
    	And there are imported channels with resources
      And I am at *Coach - '<class>' > Lessons > '<lesson>'* page
      And there is a lesson with resources

  Scenario: Add and remove resources
    When I click the *Manage resources* button
    Then I am on the *Manage resources in '<lesson>'* page
      And I see the *N resources in this lesson* text to the right
      And I see the available channels
    When I click on a channel
    Then I see its folders
    When I navigate down to a single folder and click that folder
      # A folder may have one or more sub-folders in the folder tree.
    Then I see the list of resources in that folder
    When I select one or several resources
      And I click the *Save changes* button
    Then the *Manage resources in '<lesson>'* page closes
      And I see the lesson details page
      And I see the resources which I've added to the lesson
    When I click again the *Manage resources* button
    	And I navigate back to some of the resources which I've just added
    	And I uncheck one or several of the resources
    Then I see the *N resources removed* snackbar message
    When I click the *Save changes* button
    Then the *Manage resources in '<lesson>'* page closes
      And I see the lesson details page
      And I see that the resources which I've removed from the lesson are no longer listed in the *Resources* section

  Scenario: Reorder resources in the lesson by mouse drag and drop
    When I move the cursor over a resource under the *Resources* heading
    Then it transforms to a hand
    When I drag and drop a resource up or down
    Then the *Resource order saved* snackbar notification appears
      And I see the resource in the new position

  Scenario: Reorder resources in the lesson by keyboard
    When I use the TAB key to focus the resource
    Then I see the focus ring around either up or down arrow
    When I press the ENTER or SPACEBAR key
    Then the *Resource order saved* snackbar notification appears
      And I see the resource in the new position
