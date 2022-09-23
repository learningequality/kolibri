Feature: Sync facility with a peer device
	Super admin can sync facility data between Kolibri devices that each have the same facility

	Background:
		Given I am signed in as a super admin
			And I am on *Device > Facilities*
			And I see the list of facilities on my device
			And there are other devices that have Kolibri installed
			And those devices have the same <facility> as my server
			And those devices are connected to my local network
			And those devices are currently running Kolibri

	Scenario: Sync with peer is successful
		When I click the *Sync* button for a <facility>
			Then I see the *Select a source* modal
		When I select *Local network*
			And I click *Continue*
		Then I see the *Select network address* modal
			And I see a list of devices that also have my <facility>
		When I select a device
			And I click *Continue*
		Then I see the list of facilities
			And I see a *Syncing* message under my <facility>
			And I see an indeterminate spinner
			And I see the *task manager* has a new task
		When the <facility> is done syncing
			Then I see a message under the <facility> *Last synced: just now*

	Scenario: Sync fails
		Given a sync task is running
		When the sync fails for a <facility>
		Then I see *Failed sync: just now* under the <facility> name
			And I see *Last successfully synced: <X> <time> ago under the failed sync message

	Scenario: Add new device manually is successful
		Given there is another Kolibri device that cannot be autodiscovered
			And that device shares my facility
			And that device is connected to my local network
			And that device is currently running Kolibri
		When I click the *Sync* button on a <facility>
		Then I see the *Select a network* modal
		When I select *Local network*
			And I click *Continue*
		Then I see the *Select device* modal
			And I see a list of devices that also have my <facility>
		When I click *Add new device*
		Then I see the *New device* modal
		When I enter the IP address of the undiscoverable device
			And I click *Add*
		Then I see the *Select device* modal
			And I see that device's name
			And I see that device's network
			And I see a *Forget* link for that device

	Scenario: Add new device manually fails
		Given I have a nonexistent IP address
		When I click the *Sync* button on a <facility>
			Then I see the *Select a network* modal
		When I select *Local network*
			And I click *Continue*
		Then I see the *Select device* modal
			And I see a list of devices that also have my <facility>
		When I click *Add new device*
		Then I see the *New device* modal
		When I enter the nonexistent IP address
			And I click *Add*
		Then I see the error message *Could not connect to this network address*

	Scenario: Ensure you can sync facilities after Wi-Fi network change
		Given there are at least two Kolibri instances running in the same network
			And one of the facilities is imported from the other
		When I connect both devices to a different Wi-Fi network #check in the logs that you see a log entry for zerocnf network registration for example: Registering ourselves to zeroconf network with id 'f770b209237d550fb8cc34ee00d93719' and port '8080'
			And as a Super Admin I go to Device>Facilities
			And I select the *Sync* option for the imported facility
		Then I see the *Select network address* modal
			And I see the peer device name and network address
		When I select the peer device
			And I click *Continue*
		Then I see the list of facilities
			And I see a progress bar indicating that a task is in progress
		When the <facility> is done syncing
			Then I see a message under the <facility> *Last synced: just now*

Examples:
| facility |
| MySchool |
