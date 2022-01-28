Feature: Import facility from a peer (post-setup)
	Super admin is able to import another facility to their device at any time after device setup

	Background:
		Given I am signed in as a super admin
			And I am in *Device > Facilities*

	Scenario: Select peer device
		When I click the *Import facility* button
		Then I see the *Select network address* modal
			And I see a list of peer devices
			And I see the network address of each device
		When I select a <peer> device
			And I click *Continue*
		Then I see the *Select facility* modal
			And I see one or more facilities on that device

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

Examples:
| facility | peer	 |
| MySchool | MyPeer |
