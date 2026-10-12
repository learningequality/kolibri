Feature: Super admin updates a channel and imports more content
    Super admin needs to be able to update channels on their device and import new or changed resources when the channel is republished on Studio

    # For this test case you will need to first import from an older version of a channel which you may have on another drive. Alternatively, use your own channel from Studio, make some changes on it (delete/add more resources), and publish before you attempt to update.

  Background:
    Given there is an imported version of a channel on the device
      And the same channel on Studio has been updated and republished
      And I am signed in to Kolibri as a super admin, or a user with device permissions to import content
      And I am at *Device > Channels*
      And I am connected to the internet

  Scenario: Super admin updates a channel and imports new content from Studio
    When I click *Manage* button for a channel
    Then I see the "Generating channel listing. This could take a few minutes..." notification
    When the channel listing is generated
    Then I am at the *Manage '<channel>'* page
      And I see a *Version N is available* message and a *View changes* link
      And I see the channel page with logo, name, and the current version on the device
      And I see the total number and size of channel resources
      And I see the total number and size of resources on my device
      And I see the list of folders for the channel
		When I click the *View changes* button
    Then I see the *Version N of '<channel>' is available* page
      And I see list of changes of the resources (New resources available, resources that will be deleted, resources to be updated)
      And I see the description of the latest version
		When I click the *Update channel* button
    Then I see *Update channel* modal asking for confirmation
    When I click the *Continue* button
    And I see green label with number of the new resources that can be imported on my device with this new channel version
      And I see the *0 resources selected* and a disabled *Import* button at the bottom of the screen
    When I select new resources or folders with resources
    Then the *Import* button becomes enabled
    When I click the *Import* button
    Then I see *Device > Tasks* page with the *Update '<channel>' to version N* task in progress
      And I see the progress bar with the percentage increasing
      And I see the *Cancel* button
    When the update process concludes
    Then I see the task is labeled as *Finished*
      And I do not see the progress bar anymore
      And I see the *Clear* button for the finished task
      And I see the *Clear completed* button

  Scenario: Review the channel update
    Given the channel update task has finished successfully
    When I close the *Device > Tasks* page
    Then I am at *Device > Channels* page
      And I see that now the version of the channel is the latest
      And I see the green *Resources recently updated* label
    When I click the *Manage* button
      And I click *Import more*
      And I select *Kolibri Studio*
    Then I am on channel page
      And I see that all the folder checkboxes are inactive
      And I see *X new* label for folders with new resources

  Scenario: Update channel and import new content from local drive
  # for this scenario you will need to have a more recent version of the channel on the local drive than on the device
  # disconnect the device from Internet and work only with local drives
  # workflow should be the same, no new version alert until you select to *Import more* and then the drive
