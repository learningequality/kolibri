Feature: Super admin imports entire large channel
    Super admin needs to be able to import a large channel with several thousands of resources
    # Contact content-dev team to get the token of the testing channel for this scenario
    # Since it may take some time to import this channel, consider when is the best time for you to run this scenario

  Background:
    Given I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on *Device > Channels* page
      And I selected a source to import from: Kolibri Studio, local network or attached drive

  Scenario: Import channel with several thousands of resources
    Given I see the *Select resources for import* heading
      When I click on *Select entire channels instead* link
      Then I see the page reloads
        And I see the *Select channels for import* heading
        And I see the all the N channels available on the selected source
        And I see the *Import* button is not active
        And I see *0 channels selected*

  Scenario: Select large channel
    When I check the checkbox for <channel> channel
    Then I see the *Import* button is active
      And I see *1 channel selected (size)*

  Scenario: Click the Import button
    Given that I have a channel
    When I click the *Import* button
    Then I see *Device > Task manager* page with the current task in progress
      And I see *Import '<channel>'*
      And I see the green progress bar with the percentage increasing
      And I see the *Cancel* button
    When the import process concludes
    Then I see the task is labeled as *Finished*
      And I do not see the progress bar anymore
      And I see the *Clear* button for the finished task
      And I see the *Clear completed* button

  Scenario: Review imported channel
    Given that I imported entire <channel> channel
      When I click the *Back to channels* link from the task manager page
      Then I am on *Device > Channels* page
        And I see the <channel> I've imported
      When I click the *Manage* button next to the channel name
      Then I am on *Manage '<channel>'* page
      When I click *Import more* button
        And I select the source
      Then I see that *Total size* and *On your device* values are identical
        And I see that all the checkboxes for all the <channel> topics are checked and inactive
