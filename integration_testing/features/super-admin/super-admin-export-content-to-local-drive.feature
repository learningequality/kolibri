Feature: Super admin exports entire channels or resources to local drive
    Super admin needs to be able to export channels or resources from Kolibri server to local drives

  Background:
    Given I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on *Device > Channels* page
      And there are <channel1> and <channel2> channels on the device
      And there is <resource> resource in the <channel2> channel

  Scenario: Export complete channel(s) to local drive
    Given there is at least one writable local drive attached to the device 
      When I click the *Options* button
        And I select *Export channels*
      Then I see *Channels on device* page
        And I see <channel1> and <channel2> channels and their metadata
        And I see the *Export* button is not active
      When I check the *Select all on page* checkbox
      Then I see the checkboxes for both <channel1> and <channel2> channels are checked
        And I see the value for size on disk of selected resources for both channels
        And I see the *Export* button is active
        And I see *2 channels selected (size)* notification at the bottom
      When I uncheck the <channel2> channel checkbox
      Then I don't see the value for size on disk of selected resources for <channel2> anymore
        And I see *1 channel selected (size)* notification at the bottom
      When I click *Export* button
      Then I see the *Select a drive* modal
      When I select <drive> drive
        And I click the *Continue* button
      Then the modal closes
        And I see *Device > Tasks* page with the current task in progress
        And I see the green progress bar with the percentage increasing 
        And I see *Export '<channel1>'* 
        And I see the number and size of the resources being exported
        And I see the *Cancel* button
      When the export process concludes
      Then I see the task is labeled as *Finished*
        And I do not see the progress bar anymore
        And I see the *Clear* button for the finished task
        And I see the *Clear completed* button

  Scenario: Export single or multiple resources from a channel
    When I click the *Manage* button for the <channel2> channel
    Then I see the *Manage '<channel2>'* page
      And I see the channel page with logo, name, and version
      And I see the values for number and size of resources from <channel2> channel that are on my device
      And I see the list of topics for the <channel> channel
      And I see the *Delete* and *Export* buttons are inactive

  # navigate the topic tree and select topics or resources to be deleted following the same scenarios as for import tasks

    Given that there is a <resource> resource selected
      When I click *Export* button
      Then I see the *Select a drive* modal
      When I select <drive> drive
        And I click the *Continue* button
      Then the modal closes
        And I see *Device > Tasks* page with the current task in progress
        And I see the green progress bar with the percentage increasing 
        And I see *Export resources from '<channel1>'* 
        And I see the number and size of the resources being exported
        And I see the *Cancel* button
      When the export process concludes
      Then I see the task is labeled as *Finished*
        And I do not see the progress bar anymore
        And I see the *Clear* button for the finished task
        And I see the *Clear completed* button

  Scenario: Review that the channel is exported
    When I open the <drive> local drive
    Then I see the *KOLIBRI_DATA* folder on the <drive> local drive
      And I see the *content* subfolder inside 
      And I see the *databases* and *storage* subfolders inside the *content* folder

  Scenario: No writable drives found
    Given there is no local drive attached to the device
      Or I don't have permissions to write on attached drives
    When I click *Export*
    Then I see Kolibri searching for local drives
      And I see the *Could not find a writable drive connected to the server* notification

Examples:
| channel      | resource |
| MIT Blossoms | Flowers  |