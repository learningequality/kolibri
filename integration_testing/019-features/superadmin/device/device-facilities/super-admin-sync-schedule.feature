Feature: Manage sync schedule
	Super admin can create and manage a sync schedule in order to sync facility data between Kolibri devices and KDP

	Background:
		Given I am signed in as a super admin
			And I am on *Device > Facilities*
			And I see the list of facilities on my device
			And there are other devices on which Kolibri is installed
			And those devices have the same <facility> as my server
			And those devices are connected to my local network
			And those devices are currently running Kolibri

	Scenario: Create sync schedule for a device
		When I click the *Create sync schedule* option for a facility for the first time
		Then I see the *Sync schedules* page
			And I see *Set a schedule for Kolibri to automatically sync with other Kolibri devices sharing this facility. Devices with the same sync schedule will be synced one at a time.*
			And I see the facility's name
			And I see the *Add device* button
			And I see a table with the following columns: *Device name*, *Schedule*, *Status*
			And I see *There are no syncs scheduled*
		When I click the *Add device* button
		Then I see the *Select a source* modal
			And I see the following radio buttons: *Kolibri Data Portal (online)* and *Local network or internet*
		When I select the *Local network or internet* radio button
			And I click the *Continue* button
		Then I see the *Select device* modal
			And I can see a list with available devices
		When I select a device
			And I click the *Continue* button
		Then I see the *Edit device sync schedule* page
			And I see the name of the device, the *Frequency* drop-down, the current server time and the *If scheduled sync fails, keep trying* checkbox
		When I click on the *Frequency* drop-down
		Then I see the following options: *Every hour*, *Every day*, *Every week*, *Every two weeks* and *Every month*
		When I select an option
			And I click the *Save* button
		Then I am back at the *Sync schedules* page
			And I can see the device name and address, the specified schedule and the device status in the table
			And I see an *Edit* button

	Scenario: Create sync schedule to KDP
		And I am at the *Sync schedules* page for a device
		When I click the *Add device* button
		Then I see the *Select a source* modal window
			And I see the following radio buttons: *Kolibri Data Portal (online)* which is selected by default and *Local network or internet*
		When I click the *Continue* button
		Then I see the *Register facility* modal window
		When I enter a valid project token
			And I click the *Continue* button
		Then I see the *Register facility* modal window
			And I see the following text: *Register with <KDP Project name>? Data will be saved to the cloud.
		When I click the *Register* button
		Then I see the *Edit device sync schedule* page
			And I see *Kolibri Data Portal*, the *Frequency* drop-down, the current server time and the *If scheduled sync fails, keep trying* checkbox
		When I click on the *Frequency* drop-down
			And I select one of the available options
		When I click the *Save* button
		Then I am back at the *Sync schedules* page
			And I can see the device name and address, the specified schedule and the device status in the table
			And I see an *Edit* button

	Scenario: Successful sync to KDP
		Given I've already created a sync schedule to KDP
    When I check the *Last synced* value after the specified time interval has passed
    Then I see *Last sync: <time>* under the facility name

  Scenario: Successful sync with another Kolibri server on my local network or internet
  	Given I've already created a sync schedule with another Kolibri server on my local network or internet
    When I check the *Last synced* value after the specified time interval has passed
    Then I see *Last sync: <time>* under the facility name

  Scenario: Failed sync to KDP
    #TO DO: currently this is not implemented

   Scenario: Failed sync with another Kolibri server on my local network or internet
   	#TO DO: currently this is not implemented

	Scenario: Edit device sync schedule
		Given I've already created a sync schedule for a device
			And I am at the *Sync schedules* page
		When I click the *Edit* button
		Then I am at the *Edit device sync schedule* page for the selected device
			And I see the name of the device, the *Frequency* drop-down, the server time, the *If scheduled sync fails, keep trying* checkbox and the *Remove device from sync schedule* option
		When I modify any of the options
			And I click the *Save* button
		Then I am back at the *Sync schedules* page
			And I see a *Sync schedule added* toast message
			And I see the newly specified schedule

	Scenario: Remove device from sync schedule
		Given I am at the *Edit device sync schedule* page for a device
		When I click the *Remove device from sync schedule* option
		Then I see the *Remove device* modal
			And I see the name of the device
			And I see *You are about to remove this device from the sync schedule.* #note that if the device is not connected to the network there should also be the following line of text *This device is not currently connected to your network*.
		When I click the *Remove* button
		Then I am back at the *Sync schedules* page
			And I see a *Device removed* toast message
