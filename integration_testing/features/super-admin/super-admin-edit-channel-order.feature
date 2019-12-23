Feature: Super admin edits the order of channels
    Super admin needs to be able to reorder the channels so they present to learners according to the facility needs

  Background:
    Given I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on *Device > Channels* page
      And there are at least 3 channels on the device

  Scenario: Edit channel order by mouse drag and drop
      When I click the *Options* button
        And I select *Edit channel order*
      Then I see *Edit channel order* page
      When I move the cursor over a channel
      Then it transforms to a hand
      When I drag and drop the channel up or down 
      Then the snackbar notification appears
        And I see the channel in the new position

  Scenario: Edit channel order by keyboard
    When I use the TAB key to focus the channel handle
    Then I see the focus ring around either up or down arrow
    When I press the ENTER or SPACEBAR key  
    Then the snackbar notification appears
      And I see the channel in the new position

  Scenario: Review the channel order
    When I go to *Learn > Channels*
    Then I see the same channel order that I established in the previous scenario

Examples:
| channel      |
| MIT Blossoms |