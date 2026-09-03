Feature: Super admin imports content from Studio or local address with token
    Admin needs to be able to import private/unlisted content channels on the device using the channel token

  Background:
    Given there is no content from a channel on the device
      And I have the token or the ID for the channel
      And I am signed in to Kolibri as a super admin, or a user with device permissions to import content
      And I am at the *Kolibri Studio channels > Select resources for import* page with the list of available channels #Or I am on *Import from '<local_address>' > Select resources for import* page with the list of available channels

  Scenario: Super admin imports new content channel using a token
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

  Scenario: Enter an incorrect token or channel ID
    Given I am at the *Enter channel token* modal
    When I enter an incorrect channel token or the channel ID
      And I click *Continue*
    Then I see a *Check whether you entered token correctly* error message
