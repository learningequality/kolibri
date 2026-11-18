Feature: Super admin imports entire large channel
    Super admin needs to be able to import a large channel with several thousands of resources
    # Contact content-dev team to get the token of the testing channel for this scenario
    # Since it may take some time to import this channel, consider when is the best time for you to run this scenario

  Background:
    Given I am signed in to Kolibri as a super admin, or a user with device permissions to import content
      And I am at *Device > Channels*
      And I've selected the option to import from Kolibri Studio #or local network or attached drive

  Scenario: Import channel with several thousands of resources
    Given I see the *Select resources for import* heading
    When I click on *Select entire channels instead* link
    Then I the page reloads
      And I see the *Select channels for import* heading
      And I see all of the available channels
      And I see the *Import* button is not active
      And I see *0 channels selected*
		When I check the checkbox for a channel
    Then the *Import* button becomes enabled
      And I see *1 channel selected (size)*
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

  Scenario: Review imported channel
    Given that I've imported an entire large channel
     And I am on *Device > Channels* page
    When I click the *Manage* button next to the channel name
    Then I am at the *Manage '<channel>'* page
    	And I can see all of the imported folders and content
    When I click *Import more* button
      And I select the source
    Then I see that *Total size* and *On your device* values are identical
    	And I see that all the checkboxes for all the channel folders are checked and disabled
