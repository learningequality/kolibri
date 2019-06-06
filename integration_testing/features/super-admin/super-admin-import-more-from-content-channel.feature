Feature: Super admin imports more content
    Super admin needs to be able to import additional resources from the content channels previously already imported on the device

  Background:
    Given there is partially imported content from the <channel> channel on the device
      And I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on the *Device > Channels* page

  Scenario: Import more content into channel from Kolibri Studio
    Given the device has Internet connection available
    When I click *Options* button for the <channel> channel
      And I select *Import more* options
    Then I see *Select a source* modal
    When I select *Kolibri Studio* 
      And I click *Continue*
    Then I see the *Loading channels* message
      And I see the *Select content from '<channel>'* page
      And I see the value for *Drive space available*
      And I see previously imported topics with inactive checkboxes and the label *Already on your device*
      And I see empty checkboxes for the topics not yet imported
      And I see the total number and size of <channel> channel resources
      And I see N resources from <channel> channel are listed as *On your device*
    When I check the previously not imported <topic> topic checkbox
    Then I see the *Import* button is active 
      And I see the *N resources selected* flag for the <topic> topic
      And I see the values for *Content selected* increase
    When I click the *Import* button
    Then I see *Device > Channels* page again
      And I see the *Importing content...* label and blue progress bar with the percentage increasing 
    When the import process concludes
    Then I see the progress bar at 100%
      And I see the *Finished! Click "Close" button to see changes.* flag
      And I see the *Close* button
    When I click *Close* 
    Then I see the *Content* page is reloaded 
    When I go to *Learn > Channels* page
      And I select the <channel> channel
    Then I see the <topic> topic

  Scenario: Import more content into channel from local drive
    Given there is a <drive> local drive attached to the device with more content from <channel> channel then previously imported
    When I click *Options* button for the <channel> channel
      And I select *Import more* option
    Then I see *Select a source* modal
    When I select *Attached drive or memory card* 
      And I click *Continue*
    Then I see Kolibri searching for local drives
      And I see the *Select a drive* modal
    When I select <drive> local drive
      And I click *Continue*
    Then I see the *Loading channels* message
      And I see the *Select content from '<drive>'* page with the list of available content *Channels* on the <drive> local drive
      And I see empty checkboxes for the topics not yet imported
      And I see the total number and size of <channel> channel resources
      And I see N resources from <channel> channel are listed as *On your device*
    When I check the previously not imported <topic> topic checkbox
    Then I see the *Import* button is active 
      And I see the *N resources selected* flag for the <topic> topic
      And I see the values for *Content selected* increase
    When I click the *Import* button
    Then I see *Device > Channels* page again
      And I see the *Importing content...* label and blue progress bar with the percentage increasing 
    When the import process concludes
    Then I see the progress bar at 100%
      And I see the *Finished! Click "Close" button to see changes.* flag
      And I see the *Close* button
    When I click *Close* 
    Then I see the *Content* page is reloaded 
    When I go to *Learn > Channels* page
      And I select the <channel> channel
    Then I see the <topic> topic

Examples:
| channel      | topic   | drive       |
| MIT Blossoms | Physics | Hard_Disc_1 |