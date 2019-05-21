Feature: Super admin imports more content
    Super admin needs to be able to update channels on their device and import new or changed resources when the channel is republished on Studio

  Background:
    Given there is the <channel> channel on the device, which has been updated and republished on Studio since the original import
      And I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on the *Device > Channels* page

  Scenario: Update channel and import new content from Studio
    Given the device has Internet connection available
    When I click *Options* button for the <channel> channel
      And I select *Import more* option
    Then I see *Select a source* modal
    When I select *Kolibri Studio* 
      And I click *Continue*
    Then I see the *Loading channels* message
      And I see the *Select content from '<channel>'* page
      And I see the *New channel version available. Some of your files may be outdated or deleted.* notification
      And I see the *Update* button
    When I click *Update*
    Then I see the *Updating channel* progress bar
      And I see the *Select content from '<channel>'* page reload
    When reload finishes
    Then I see previously imported topics with inactive checkboxes and the label *Already on your device*
      And I see empty checkboxes for the topics that not yet imported
      And I see the total number and size of <channel> channel resources
      And I see N resources from <channel> channel are listed as *On your device*
      And I see the *Import* button is inactive 
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
      And I see the *Close* button is active
    When I click *Close* 
    Then I see the *Channels* page is reloaded 
    When I go to *Learn > Channels* page
      And I select the <channel> channel
    Then I see the <topic> topic

  Scenario: Update channel and import new content from local drive
    Given there is a <drive> local drive attached to the device with the updated version of the <channel> channel
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
      And I see the *New channel version available. Some of your files may be outdated or deleted.* notification
      And I see the *Update* button
    When I click *Update*
    Then I see the *Updating channel* progress bar
      And I see the *Select content from '<channel>'* page reload
    When reload finishes
    Then I see previously imported topics with inactive checkboxes and the label *Already on your device*
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