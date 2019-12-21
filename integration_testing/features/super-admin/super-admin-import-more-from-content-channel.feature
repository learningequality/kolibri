Feature: Super admin imports more content
    Super admin needs to be able to import additional resources from the content channels previously already imported on the device

  Background:
    Given there is partially imported content from the <channel> channel on the device
      And I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on the *Device > Channels* page

  Scenario: Import more content into channel from Kolibri Studio
    Given the device has Internet connection available
    When I click *Manage* button for the <channel> channel
    Then I see *Manage '<channel>'* page
    When I click the *Import more* button
    Then I see *Select a source* modal
    When I select *Kolibri Studio* 
      And I click *Continue*
    Then I see the '<channel>' channel page
      And I see previously imported topics with inactive checkboxes and the label *Already on your device*
      And I see empty checkboxes for the topics not yet imported
      And I see the total number and size of <channel> channel resources
      And I see N resources from <channel> channel are listed as *On your device*
      And I see *0 resources selected* at the bottom bar
      And I see the *Import* button is not active 

# continue testing using the select and import scenarios from `super-admin-import-new-content-channel-from-studio.feature`

  Scenario: Import more content into channel from local drive
    Given there is a <drive> local drive attached to the device with more content from <channel> channel then previously imported
    When I click *Manage* button for the <channel> channel
    Then I see *Manage '<channel>'* page
    When I click the *Import more* button
    Then I see *Select a source* modal
    When I select *Attached drive or memory card* 
      And I click *Continue*
    Then I see Kolibri searching for local drives
      And I see the *Select a drive* modal
    When I select <drive> local drive
      And I click *Continue*
    Then I see the '<channel>' channel page
      And I see previously imported topics with inactive checkboxes and the label *Already on your device*
      And I see empty checkboxes for the topics not yet imported
      And I see the total number and size of <channel> channel resources
      And I see N resources from <channel> channel are listed as *On your device*
      And I see *0 resources selected* at the bottom bar
      And I see the *Import* button is not active 

# continue testing using the select and import scenarios from `super-admin-import-new-content-channel-from-studio.feature`

Scenario: Selected channel is not on the local drive
    Given I am on the *Manage '<channel>'* page
    When I click the *Import more* button
    Then I see *Select a source* modal
    When I select *Attached drive or memory card* 
      And I click *Continue*
    Then I see Kolibri searching for local drives
      And I see the *Select a drive* modal
    When I select <drive> local drive
      And I click *Continue*
    Then I see the *Channel not found on drive* notification

Examples:
| channel      | topic   | drive       |
| MIT Blossoms | Physics | Hard_Disc_1 |
