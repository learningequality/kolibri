Feature: Super admin imports content from Studio
    Super admin needs to be able to import content channels on the device from Kolibri Studio

    # Use the "Khan Academy (English)" for testing because it takes a long time to load the channel listing.

  Background:
    Given there is no content from a studio channel on the device
      And I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am at the *Import from Kolibri Studio* page with the list of available channels #or I am on *Import from '<local_address>' > Select resources for import* page with the list of available channels

  Scenario: Import resources from a new content channel
    When I click *Select resources* button for a channel
    Then I see the *Kolibri Studio* page
      And I see the "Generating channel listing. This could take a few minutes..." notification
    When the channel listing is generated
    Then I see the channel page with logo, name, and version
      And I see the total number and size of channel resources
      And I see 0 resources from channel are listed as *On your device*
      And I see the list of folders for the channel
      And I see the *Import* button is disabled

  Scenario: Navigate the folder tree
    When I click the <folder> folder link
    Then I see the list of subfolders for the <folder> folder
      And I see the channel name as a breadcrumb link
      And I see the folder name as a breadcrumb next to the channel name
    When I click the <subfolder> subfolder link
    Then I see the list of subfolders for the <subfolder> subfolder
      And I see the subfolder name as a link
      And I see the subfolder name as a breadcrumb next to the folder name
    When I click the folder name link in the breadcrumb
    Then I see the folder tree page
    When I click the channel name link
    Then I see the list of folders for the channel

  Scenario: Select all folders or subfolders
    When I check the *Select all* checkbox
    Then I see the *Import* button is active
      And I see the checkboxes for all the folders or subfolders are checked
      And I see the *N resources selected* flag for each folder
      And I see the total size and number of resources selected at the bottom
      And the total equals the sum of resources for each folder

  Scenario: Deselect a sub-set of subfolders
    Given I am on a subfolder and there are other folders checked outside the current subfolder
    When I uncheck the *Select all* checkbox
    Then I see the *Import* button is still active
      And I see the checkboxes for all the subfolders of the current folder are unchecked
      And I do not see the number of *resources selected* flag for unchecked folders
      And I see the total value of *resources selected* at the bottom has decreased for the number of resources in the unchecked folders

  Scenario: Deselect all folders or subfolders
    Given that no other folders are checked in the folder tree
    When I uncheck the *Select all* checkbox
    Then I see the *Import* button is disabled
      And I see the checkboxes for all the subfolders are unchecked
      And I do not see the number of *resources selected* flag for unchecked folders
      And I see the *0 resources selected* at the bottom

  Scenario: Check a folder or subfolder
    When I check a <folder> folder checkbox
    Then I see the *Import* button is active
      And I see the number of *resources selected* flag for the selected folder checkbox
      And I see the number of *resources selected* at the bottom increase

  Scenario: Uncheck a folder or subfolder
    Given there are two or more folders checked
    When I uncheck a folder checkbox
    Then I see the *Import* button is still active
      And I do not see the number of *resources selected* flag for the unchecked folder
      And I see the number of *resources selected* at the bottom has decreased for the number of resources in the unchecked folders

  Scenario: Uncheck the only folder
    Given there is only one folder checked
    When I uncheck the only checked folder checkbox
    Then I see the *Import* button is disabled
      And I do not see the number of *resources selected* flag for the unchecked folder
      And I see the *0 resources selected* at the bottom

  Scenario: Navigating a folder with many subfolders
    Given I am navigating a <folder> folder with enough subfolders to fill up the window height
      And one <subfolder> subfolder also has enough items in it to fill up the window height
    When I scroll down to the bottom of the page while inside the <folder>
    Then I see that the folder name has scrolled out of view
    When I click the <subfolder> subfolder link
    Then I see the list of its subfolders
      And I see that the page is scrolled so that the <subfolder> name and breadcrumb links are now aligned to the top of the window
    When I click the parent <folder> folder in the breadcrumb link
      And I see that the page still displays the breadcrumb links aligned to the top of the window

  Scenario: Click the Import button
    Given that I have selected at least one folder or subfolder
    When I click the *Import* button
    Then I see *Device > Task manager* page with the current task in progress
      And I see the green progress bar with the percentage increasing
      And I see *Import resources from ''*
      And I see the number and size of the resources being imported
      And I see the *Cancel* button
    When the import process concludes
    Then I see the task is labeled as *Finished*
      And I do not see the progress bar anymore
      And I see the *Clear* button for the finished task
      And I see the *Clear completed* button

  Scenario: Click the *Clear* button
    Given that there are one or more finished import tasks
      When I click the *Clear* button for one finished task
      Then I don't see it on the *Task* list

  Scenario: Click the *Clear completed* button
    Given that there are one or more finished import tasks
      When I click the *Clear completed* button
      Then I see the *There are no tasks to display* notification

  Scenario: Review imported resources
    Given that there are one or more finished import tasks
      When I click the *Back to channels* link
      Then I am on *Device > Channels* page
        And I see the  I've imported resources from
        And I see the size of resources that were imported
