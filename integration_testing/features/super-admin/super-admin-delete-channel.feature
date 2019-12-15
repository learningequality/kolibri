Feature: Super admin deletes channel(s) or resource(s)
    Super admin needs to be able to delete complete content channels and single or multiple resources from the device

  Background:
    Given I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on *Device > Channels* page
      And there are <channel1> and <channel2> channels on the device
      And there is <resource> resource in the <channel2> channel

  Scenario: Delete complete channel(s)
    When I click the *Options* button
      And I select *Delete channels*
    Then I see *Channels on device* page
      And I see <channel1> and <channel2> channels and their metadata
      And I see the *Delete* button is not active
    When I check the *Select all on page* checkbox
    Then I see the checkboxes for both <channel1> and <channel2> channels are checked
      And I see the value for size on disk of selected resources for both channels
      And I see the *Delete* button is active
      And I see *2 channels selected (size)* notification at the bottom
    When I uncheck the <channel2> channel checkbox
    Then I don't see the value for size on disk of selected resources for <channel2> anymore
      And I see *1 channel selected (size)* notification at the bottom
    When I click *Delete* button
    Then I see the *Delete channels* modal asking for confirmation
    When I click the *Delete* button
    Then the modal closes
      And I see *Device > Tasks* page with the current task in progress
      And I see the green progress bar with the percentage increasing 
      And I see *Delete '<channel1>'* 
      And I see the number and size of the resources being deleted
      And I see the *Cancel* button
    When the delete process concludes
    Then I see the task is labeled as *Finished*
      And I do not see the progress bar anymore
      And I see the *Clear* button for the finished task
      And I see the *Clear completed* button

  Scenario: Review that the channel is deleted
    Given that the channel delete task is labeled as *Finished*
      When I click the *Back to channels* link
      Then I am on *Device > Channels* page
        And I do not see the <channel1> anymore

  Scenario: Delete single or multiple resources from a channel
    When I click the *Manage* button for the <channel2> channel
    Then I see the *Manage '<channel2>'* page
      And I see the channel page with logo, name, and version
      And I see the values for number and size of resources from <channel2> channel that are on my device
      And I see the list of topics for the <channel> channel
      And I see the *Delete* and *Export* buttons are inactive

  # navigate the topic tree and select topics or resources to be deleted following the same scenarios as for import tasks

    Given that there is a <resource> resource selected
    When I click *Delete* button
    Then I see the *Delete resource* modal asking for confirmation
      And I see the checkbox to delete all the copies in other locations
    When I check the *Also delete...* checkbox
      And I click the *Delete* button
    Then the modal closes
      And I see *Device > Task manager* page with the current task in progress
      And I see the green progress bar with the percentage increasing 
      And I see *Delete resources from '<channel2>'* 
      And I see the number and size of the resources being deleted
      And I see the *Cancel* button
    When the delete process concludes
    Then I see the task is labeled as *Finished*
      And I do not see the progress bar anymore
      And I see the *Clear* button for the finished task
      And I see the *Clear completed* button      

  Scenario: Review that the resource is deleted
    Given that the <resource> delete task is labeled as *Finished*
      When I click the *Back to channels* link
        And I go to *Learn > Channels* page
        And I navigate the <channel2> to the topic(s) where the <resource> used to be located
      Then I do not see the <resource> anymore

Examples:
| channel      | resource |
| MIT Blossoms | Flowers  |
