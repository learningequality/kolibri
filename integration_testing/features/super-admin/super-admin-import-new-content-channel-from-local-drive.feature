Feature: Super admin imports from a new channel on a local drive
    Super admin needs to be able to import content channels available on local drives, but previously not imported on the device

  Background:
    Given there is no content from <channel> channel on the device
      And I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on *Import from '<drive>' > Select resources for import* page with the list of available channels

  Scenario: Import new resources from local drive
    When I click *Select resources* button for the <channel> channel
    Then I see the *Loading channel...* in the top bar
      And I see the "Generating channel listing. This could take a few minutes..." notification
    When the channel listing is generated
    Then I am on the *Importing from '<drive>'* page
      And I see the channel page with logo, name, and version
      And I see the total number and size of <channel> channel resources   
      And I see 0 resources from <channel> channel are listed as *On your device*
      And I see the list of topics for the <channel> channel
      And I see the *Import* button is inactive

# continue testing using the select and import scenarios from `super-admin-import-new-content-channel-from-studio.feature`

Examples:
| drive       | channel      |
| Hard_Disc_1 | MIT Blossoms |