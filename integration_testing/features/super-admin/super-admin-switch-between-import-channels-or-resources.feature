Feature: Super admin selects to import entire channels or only topics/resources
    Super admin needs to be able to switch between importing entire channels and importing topics or resources 

  Background:
    Given I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on *Device > Channels* page
      And I selected a source to import from: Kolibri Studio, local network or attached drive

  Scenario: Import entire content channels
    Given I see the *Select resources for import* heading
      When I click on *Select entire channels instead* link
      Then I see the page reloads
        And I see the *Select channels for import* heading
        And I see the all the N channels available on the selected source
        And I see the *Import* button is not active
        And I see *0 channels selected*

  Scenario: Select/deselect all the channels
    When I check the *Select all* checkbox
    Then I see the checkboxes for all the channels are checked
      And I see the *Import* button is active
      And I see the *N channels selected (M GB)* 

  Scenario: Select/deselect channels
    When I uncheck the *Select all* checkbox
      And I check just the checkbox for <channel> channel
    Then I see the *Import* button is active
      And I see *1 channel selected (size)*
    When I keep selecting and deselecting channels
    Then I see the selected values for number and size at the bottom increase or decrease accordingly

  Scenario: Click the Import button
    Given that I have selected at least one channel
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
      When I click the *Options* button
        And I select *Manage*
      Then I am on *Manage '<channel>'* page
      When I click *Import more* button
        And I select the source
      Then I see that *Total size* and *On your device* values are identical
        And I see that all the checkboxes for all the <channel> topics are checked and inactive

  Scenario: Import topics or resources
    Given I see the *Select entire channels instead* heading
      When I click on *Select topics and resources instead* link
      Then I see the page reloads
        And I see the *Select resources for import* heading
        And I see the all the N channels available on the selected source
        And I see the *Select resources* button for each of the channels

        # continue testing from `super-admin-import-new-content-channel-from-studio.feature`

Examples:
| channel      |
| MIT Blossoms |
