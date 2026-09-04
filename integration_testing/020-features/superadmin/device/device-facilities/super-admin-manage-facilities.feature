Feature: Managing facility tasks
  Super admin is able to create a new facility or to import another facility to their device at any time after device setup

  Background:
    Given I am signed in as a super admin
      And I have at least one facility on my device
      And I am at *Device > Facilities*

  Scenario: Select peer device
		When I click the *Import facility* button
		Then I see the *Select network address* modal
			And I see a list of peer devices
			And I see the network address of each device
		When I select a <peer> device
			And I click *Continue*
		Then I see the *Select facility* modal
			And I see one or more facilities on that device

	Scenario: No peers are automatically discovered
    When there are no Kolibri peers around me
    Then I see a loading spinner
    # No *Searching* notification any more?
      And I don't see any available addresses displayed in the modal

  Scenario: Connect to a Kolibri peer with content
    When there are Kolibri peers around me
      And peers have content available
    Then I see a loading spinner
    # No *Searching* notification any more?
      And I see a list of found local Kolibri peers # below the manually entered network addresses, if any
      And for each peer I see their device name, 4 digits peer ID, IP address and port

	Scenario: Import facility from a peer with a single facility
		Given there is only the <facility> facility on the <peer> device
			And I am on the *Enter admin credentials* modal
		When I enter the <username> and <password> of a facility admin for the <facility> or a super admin for the <peer>
			And I click *Continue*
		Then I see the <facility> appear in my *Facilities* list
			And I see an indeterminate spinner
			And I see the status message *Syncing*
			And I see the *task manager* has a new task
		When the <facility> is done syncing
		Then I see a message under the new facility name *Last synced: just now*

	Scenario: Import facility from a peer with multiple facilities
		Given there is more than one facility on the <peer> device
			And I am on *Select facility* modal
			And I see two or more facilities on that device
		When I select the facility I want to import
			And I click *Continue*
		Then I am on the *Enter admin credentials* modal
		When I enter the <username> and <password> of a facility admin for the <facility> or a super admin for the <peer>
			And I click *Continue*
		Then I see the *Tasks* page
			And I see the status message *Syncing '<facility>'*
			And I see an indeterminate spinner
		When the <facility> import is finished
			And I click *Back to facilities*
		Then I see the <facility> appear in my *Facilities* list
			And I see a message under the new <facility> *Last synced: just now*

	Scenario: Import facility from a peer by manually adding the URL address of an existing Kolibri instance
		When I click the *Import facility* button
		Then I see the *Select network address* modal
			And I see a list of peer devices
			And I see the network address of each device
		When I click *Add new address*
    Then I see the *New address* modal
		When I enter the URL address of an existing Kolibri instance in the *Full network address* field
    	And I enter a name for this address in the *Name* field
    	And I click *Add*
    Then I am back at the *Select network address* modal
    	And I see that the added network address is selected
    When I click *Continue*
		Then I see the *Select facility* modal
			And I see one or more facilities on that device
		When I select a <facility>
			And I click *Continue*
		Then I am on the *Enter admin credentials* modal
		When I enter the <username> and <password> of a facility admin for the <facility> or a super admin for the <peer>
			And I click *Continue*
		Then I see the *Tasks* page
			And I see the status message *Syncing '<facility>'*
			And I see an indeterminate spinner
		When the <facility> import is finished
			And I click *Back to facilities*
		Then I see the <facility> appear in my *Facilities* list
			And I see a message under the new <facility> *Last synced: just now*

	Scenario: Import facility from a peer failed
		Given a sync task is running
		When the sync fails for a <facility>
		Then I see *Failed sync: just now* under the <facility> name
			And I see *Last successful sync: <X> <time> ago under the failed sync message

	Scenario: Ensure you can import a facility after Wi-Fi network change
		Given there are at least two Kolibri instances running in the same network
		When I connect both devices to a different Wi-Fi network #check in the logs that you see a log entry for zerocnf network registration for example: Registering ourselves to zeroconf network with id 'f770b209237d550fb8cc34ee00d93719' and port '8080'
			And as a Super Admin I go to Device>Facilities
			And I click the *Import facility* button
		Then I see the *Select network address* modal
			And I see the peer device name and network address
		When I select the peer device
			And I click *Continue*
		Then I see the *Select facility* modal
		When I select a facility
			And I click *Continue*
		Then I see the *Enter admin credentials* modal
		When I enter a *Username* and a *Password*
			And I click *Continue*
		Then I see the *Tasks* page
			And I can see that the import has finished
		When I click the *Back to facilities* link
		Then I see the list with facilities
			And I can see the newly imported facility
			And I can see a message stating when it was last synced

	Scenario: Successfully remove a facility
    Given there are at least two facilities on my device
     	And my super admin account is not a member of the facility
    When I click the *Options* drop-down for a facility
    	And I click *Remove*
    Then I see the *Remove facility from this device* modal
      And I see that the *I understand the consequences of removing the facility* checkbox is unchecked
      And I see that the *Remove* button is disabled
    When I click the checkbox
      Then I the *Remove* button becomes enabled
    When I click the *Remove* button
    Then the facility disappears
    	And I see a *Removed <facility name> from this device* snackbar message
      And I see that a task has been added to the task manager

  Scenario: View removal task in task manager
    Given I started a task to remove a facility from the device
    When I click *View task manager*
    Then I see the sync task I started
      And I see it is *Waiting*
      And I see a clock icon
      And I see *Remove <facility>*
      And I see the 4 digit unique ID of <facility>
      And I see my username in *Started by 'username'*
    When the removal task begins
    Then I see *Removing facility*
      And I see an indeterminate spinner
      And I don't see a *Cancel* button
    When the removal finishes
    Then I see *Finished*
      And I see a green check
      And I see *Facility successfully removed*
      And I see a *Clear* button

  Scenario: Facility removal fails
    Given a facility removal task is in progress
    When the removal fails
    Then I see *Failed*
      And I see a red error icon
      And I see a *Clear* button
      And I see a *Retry* button

  Scenario: Attempt to remove ones own facility
    Given my super admin account is a member of the <facility>
    When I click *Options* for <facility>
    When I click *Remove facility*
    Then I see the *Cannot remove facility* modal
      And I see *Super admins cannot remove facilities they are a member of*
      And I see other instructions on how I can remove it from the device
      And I see a *Close* button

  Scenario: Sync task is successful
    When I click *View task manager*
    Then I see the sync task I started
      And I see it has the *Waiting* status
      And I see a clock icon
      And I see the name of the device it is syncing with
      And I see the 4 digit unique ID of the device it is syncing with
      And I see an icon for the OS of the device
      And I see the network address of the device it is syncing with
      And I see my username in *Started by '<username>'*
      And I see a *Cancel* button for the task
    When the sync task begins
    Then I see *1 of 7 - Establishing connection*
      And I see an indeterminate spinner
    When this step is finished
    Then I see *2 of 7 - Remotely preparing data*
    When this step is finished
    Then I see *3 of 7 - Receiving data*
    When this step is finished
    Then I see *4 of 7 - Locally integrating received data*
    When this step is finished
    Then I see *5 of 7 - Locally preparing data to send*
    When this step is finished
    Then I see *6 of 7 - Sending data*
    When this step is finished
    Then I see *7 of 7 - Remotely integrating data*
    When this step is finished
    Then I see *Finished* status
      And I see a green check icon
      And I see how many MB were sent
      And I see how many MB were received
      And I see a *Clear* button for the task
          Scenario: Cancel sync task
    When I click *View task manager*
    Then I see the sync task I started
    When I click *Cancel*
    Then I see a *Cancelled* status for the task
      And I see a red error icon
      And I see a *Clear* button
      And I see a *Retry* button

  Scenario: Successfully retry a errored sync task
    When I click *View task manager*
    Then I see the sync task I started
    When there is an error with the sync task
    Then I see *X of 7: Failed*
      And I see a red error icon
      And I see a *Clear* button
      And I see a *Retry* button
    When I click *Retry*
    Then I see the sync task resume at step *X of 7*

  Scenario: Clear a single sync task
    Given a task has finished
      When I click *View task manager*
      Then I see the finished sync tasks
      When I click *Clear*
      Then I don't see the task in the list

  Scenario: Clear all completed tasks from task manager page
    Given at least one task has finished
      And I am on the task manager page
    When I click *Clear completed*
    Then I don't see any tasks
        Scenario: Clear all compeleted tasks from *Device > Facilities*
    Given at least one task has finished
      And I am in *Device > Facilities*
      And I see *X of X task(s) complete*
      And I see a progress bar
    When I click *Clear completed*
    Then I don't see *X of X task(s) complete*
    #this is not on *Tasks* page, but on *Facilities*
      And I don't see a progress bar
      And I don't see *Clear completed*
