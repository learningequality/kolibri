Feature: Super admin imports content from Studio or local address with token
    Admin needs to be able to import private/unlisted content channels on the device using the channel token

  Background:
    Given there is no content from <channel> channel on the device
      And I have the <token> token or the <id> ID for the <channel> channel
      And I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on the *Kolibri Studio channels > Select resources for import* page with the list of available channels
        Or I am on *Import from '<local_address>' > Select resources for import* page with the list of available channels

  Scenario: Import new content channel using the token
    When I click on *Import with token* button
    Then I see the *Enter channel token* modal
    When I enter the channel <token> token
      And I click *Continue*
    Then the modal closes
      And I see the list of topics for the <channel> channel
      And I see the total number and size of <channel> channel resources
      And I see 0 resources from <channel> channel are listed as *On your device*

  Scenario: Enter wrong token or ID
    When I click on *Import with token* button
    Then I see the *Enter channel token* modal
    When I enter the wrong channel <token> token or the <id> ID
      And I click *Continue*
    Then I see the *Check whether you entered token correctly* error message

# continue testing using the select and import scenarios from `super-admin-import-new-content-channel-from-studio.feature`

Examples:
| channel      | token       | local_address |
| MIT Blossoms | nakav-mafak | StudioDevelop |