Feature: Super admin can manage channels and resources
  Super admins need to see the *Device > Channels* page and to be able to manage channels and resources

  Background:
    Given I am signed in to Kolibri as a super admin, or a user with device permissions to import content
    	And I am connected to the internet
    	And I am connected to other devices in the network with installed channels on them
    	And there is an attached drive or memory card to the device

  Scenario: Channels page default state
    When I go to the *Device > Channels* page
    Then I see the *Channels* label
    	And I see a *No channels installed* message
    	And I see an *Import* button

  Scenario: Super admin imports content from Studio
  	When I click the *Import* button
  	Then I see the *Select a source* modal
  		And I see the *Kolibri Studio (online)* option selected by default
  	When I click *Continue*
  	Then I am at *Select resources for import*
  		And I see a list of available channels
  	When I click the *Select resources* button next to a channel
  	Then I see the channel page with logo, name, and version of the channel
  	  And I see the total number and size of the channel resources
  	  And I see the list of folders for the channel
  	  And I see that the *Import* button is inactive
  	When I check the *Select all* checkbox
  	Then I see the *Import* button is active
  	When I click the *Import* button
  	Then I am at the *Task manager* page
  		And I see the *Import resources from <channel>* progress bar
  		And I see the number and size of the resources being imported
  		And I see the *Cancel* button
  	When the import process concludes
  	Then I see the task is labeled as *Finished*
  		And I do not see the progress bar anymore
  		And I see the *Clear* button for the finished task
  		And I see the *Clear completed* button
  	When I close the *Task manager* page
  	Then I am back at *Device > Channels*
  		And I can see the imported channel

  Scenario: Super admin imports content from local network or or internet
  	Given I am at the *Select a source* modal
  	When I select the *Local network or internet* option
  		And I click *Continue*
  	Then I see the *Select device* modal
  		And I see that the first available device is pre-selected
  	When I click *Continue*
  	Then I am at *Select resources for import*
  		And I see a list of available channels
  	When I click the *Select resources* button next to a channel
  	Then I see the channel page with logo, name, and version of the channel
  	  And I see the total number and size of the channel resources
  	  And I see the list of folders for the channel
  	  And I see that the *Import* button is disabled
  	When I check the *Select all* checkbox
  	Then I see the *Import* button is enabled
  	When I click the *Import* button
  	Then I am at the *Task manager* page
  		And I see the *Import resources from <channel>* progress bar
  		And I see the number and size of the resources being imported
  		And I see the *Cancel* button
  	When the import process concludes
  	Then I see the task is labeled as *Finished*
  		And I do not see the progress bar anymore
  		And I see the *Clear* button for the finished task
  		And I see the *Clear completed* button
  	When I close the *Task manager* modal
  	Then I am back at *Device > Channels*
  		And I can see the imported channel

  Scenario: Super admin imports content from attached drive
  	Given I am at the *Select a source* modal
  	When I click the *Import* button
  	Then I see the *Select a source* modal
  	When I select the *Attached drive or memory card* option
  		And I click *Continue*
  	Then I see the *Select drive* modal
  		And I see that the first available drive is pre-selected
  	When I click *Continue*
  	Then I am at *Select resources for import*
  		And I see a list of available channels
  	When I click the *Select resources* button next to a channel
  	Then I see the channel page with logo, name, and version of the channel
  	  And I see the total number and size of the channel resources
  	  And I see the list of folders for the channel
  	  And I see that the *Import* button is disabled
  	When I check the *Select all* checkbox
  	Then I see the *Import* button is enabled
  	When I click the *Import* button
  	Then I am at the *Task manager* page
  		And I see the *Import resources from <channel>* progress bar
  		And I see the number and size of the resources being imported
  		And I see the *Cancel* button
  	When the import process concludes
  	Then I see the task is labeled as *Finished*
  		And I do not see the progress bar anymore
  		And I see the *Clear* button for the finished task
  		And I see the *Clear completed* button
  	When I close the *Task manager* modal
  	Then I am back at *Device > Channels*
  		And I see all of the imported channels

  Scenario: Super admin imports new content channel using a token
    Given I am at *Import from Kolibri Studio > Select resources for import*
    When I click the *Import with token* button
    Then I see the *Enter channel token* modal
    When I enter the channel token
      And I click *Continue*
    Then the modal closes
    	And I see a *Generating channel listing. This could take a few minutes* message
			And I see the channel page with logo, name, and version of the channel
  	  And I see the total number and size of the channel resources
  	  And I see the list of folders for the channel
  	  And I see that the *Import* button is disabled
  	When I check the *Select all* checkbox
  	Then I see the *Import* button is enabled
  	When I click the *Import* button
  	Then I am at the *Task manager* page
  		And I see the *Import resources from <channel>* progress bar
  		And I see the number and size of the resources being imported
  		And I see the *Cancel* button
  	When the import process concludes
  	Then I see the task is labeled as *Finished*
  		And I do not see the progress bar anymore
  		And I see the *Clear* button for the finished task
  		And I see the *Clear completed* button
  	When I close the *Task manager* modal
  	Then I am back at *Device > Channels*
  		And I can see the imported channel

  Scenario: Super admin exports content to an attached drive
  	When I click the *Options* drop-down
  		And I select the *Export channels* option
  	Then I see the *Export channels* modal
  		And I see all the channels on the device
  	When I select a channel #or some resources
  		And I click the *Export* button
  	Then I see the *Select a drive* modal
  		And I see that the first available drive is pre-selected
  	When I click *Continue*
  	Then I am at the *Task manager* page
  		And I see the *Export <channel>* progress bar
  		And I see the number and size of the resources being exported
  		And I see a *Cancel* button
  	When the export has finished
  	Then I see the task is labeled as *Finished*
  		And I do not see the progress bar anymore
  		And I see the *Clear* button for the finished task
  		And I see the *Clear completed* button
  	When I open the drive
    Then I see the *KOLIBRI_DATA* folder on the drive
      And I see the *content* subfolder inside
      And I see the *databases* and *storage* subfolders inside the *content* folder

  Scenario: Super admin cannot export content if there are no writable drives
    Given I am at *Export channels* modal
    	And I have selected either a channel or resources for export
    	And there is no local drive attached to the device #Or I don't have permissions to write on attached drives
    When I click the *Export* button
    Then I see the *Select a drive* modal
    	And I see Kolibri searching for local drives
      And I see the *Could not find a writable drive connected to the server* notification
      And the *Continue* button is disabled

  Scenario: Super admin cancels a task in progress
    Given I am at the *Device > Tasks manager* page
    	And there is an import, export or delete task in progress
    When I click the *Cancel* button
    Then I see the red *!* icon
      And I see the task has been labeled as *Canceled*
      And I see the *N of M resources (size)* imported(exported, deleted)
      And I see the *Clear* button for the finished task
      And I see the *Clear completed* button

  Scenario: Edit channel order by mouse drag and drop
    When I click the *Options* button
      And I select *Edit channel order*
    Then I see the *Edit channel order* page
    When I move the cursor over a channel
    Then the cursor shape changes to a hand
    When I drag and drop the channel up or down
    Then I see the *Channel order saved* snackbar notification
      And I see the channel in the new position
    When I close the *Edit channel order* page
  	Then I am back at *Device > Channels*
  		And I see the channels ordered in the specified order

  Scenario: Edit channel order by keyboard
    When I use the TAB key to focus the channel handle
    Then I see the focus ring around either up or down arrow
    When I press the ENTER or SPACEBAR key
    Then I see the *Channel order saved* snackbar notification
      And I see the channel in the new position
    When I close the *Edit channel order* page
  	Then I am back at *Device > Channels*
  		And I see the channels ordered in the specified order
