Feature: Super admin imports more content
    Super admin needs to be able to update channels on their device and import new or changed resources when the channel is republished on Studio

    # For this test case you will need to first import from an older version of a channel that you may have on another drive. Alternatively, use your own channel from Studio, make some changes on it (delete/add more resources), and publish before you attempt to update.

  Background:
    Given there is the <channel> channel on the device, at the version *L*
      And the same channel on Studio has been updated and republished, at the version *N*
      And I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on the *Device > Channels* page

  Scenario: Update channel and import new content from Studio
    Given the device has Internet connection available
      When I click *Manage* button for the <channel> channel
      Then I see the *Loading...* in the top bar
        And I see the "Generating channel listing. This could take a few minutes..." notification
      When the channel listing is generated
      Then I am on the *Manage '<channel>'* page
        And I see the *Version N is available* blue notification
        And I see the *View changes* button
        And I see the channel page with logo, name, and the current version on the device
        And I see the total number and size of <channel> channel resources
        # these values need to refer to the current version on the device
        And I see M resources from <channel> channel are listed as *On your device*
        And I see the list of topics for the <channel> channel
        And I see the *Import* button is inactive

  Scenario: Review changes in the new channel version
    When I click the *View changes* button
    Then I see the *Version N of '<channel>' is available* page
      And I see list of changes of the resources (new, to be deleted, to be updated) if I choose to update the channel
      And I see the *Update channel* button
      And I see the information about the changes in previous versions of the channel # if stated on Studio during publishing

  Scenario: Update channel to the new version
    When I click the *Update channel* button
    Then I see *Update channel* modal asking for confirmation
    When I click *Continue* button
    Then I see the information about resources on version N of <channel>
      And I see the *Import more* button
    When I click the *Import more* button
      And I select the source
    Then for each topic with new resources I see the information about those that are already on my device
      And I see green label with number of the new resources that can be imported on my device with this new channel version
      And I see the *0 resources selected* and the inactive *Import* button at the bottom of the screen
    When I select the checkbox(es) for topic(s) with the new resources
      Or I use the *Select all* checkbox
    Then I see the *X resources selected*
      And I see an active *Import* button at the bottom of the screen
    When I click the *Import* button
    Then I see *Device > Tasks* page with the *Update '<channel>' to version N* task in progress
      And I see the green progress bar with the percentage increasing
      And I see the *Cancel* button
    When the update process concludes
    Then I see the task is labeled as *Finished*
      And I do not see the progress bar anymore
      And I see the *Clear* button for the finished task
      And I see the *Clear completed* button

  Scenario: Review the channel update
    Given that the channel update task has finished
      When I click the *Back to channels* link
      Then I am on *Device > Channels* page
        And I see the <channel> I've updated
        And I see the version of the channel is N
        And I see the green *New* label
      When I click the *Manage* button
        And I click *Import more*
        And I select *Kolibri Studio*
      Then I am on <channel> channel page
        And I see that all the topic checkboxes are inactive
        And I see *X new* label for topic(s) with new resources

  Scenario: Do not update channel to the new version
    Given that I am on *'<channel>' > Version N of '<channel>' is available* page
      But I decide not to update
      And I click the back arrow buttons
      And I go back to *Device > Channels*
    Then I still see the <channel> channel at the version *L*

  Scenario: Update channel and import new content from local drive
  # for this scenario you will need to have a more recent version of the channel on the local drive than on the device
  # disconnect the device from Internet and work only with local drives
  # workflow should be the same, no new version alert until you select to *Import more* and then the drive
