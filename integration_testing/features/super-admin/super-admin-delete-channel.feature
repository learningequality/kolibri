Feature: Super admin deletes channel
    Super admin needs to be able to delete content channels from the device

  Background:
    Given I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on *Device > Channels* page
      And there is a <channel> channel on the device

  Scenario: Delete channel
    When I click on *Options* button for the <channel> channel
      And I select *Delete*
    Then I see *Delete channel* modal with the confirmation message
    When I click *Delete* button
    Then the modal closes
      And I see the *Preparing...* and *Deleting channel...* messages
    When the delete process is finished
    Then I see the *Finished! Click 'Close' button to see changes*
    When I click the *Close* button
    Then I see the *Device > Channels* page is reloaded
      And I don't see the <channel> channel anymore

Examples:
| channel      |
| MIT Blossoms |
