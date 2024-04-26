Feature: Admin syncs facility
  Admin needs to be able to sync their facility data to Kolibri Data Portal or another Kolibri server on their local network or internet

  Background:
    Given I am signed in as a Facility admin
      And my facility has been registered before
      And I want to sync my facility data to Kolibri Data Portal
      And I am at *Facility > Data*
      And there are other devices with Kolibri on the network

  Scenario: Learn what sync does
    When I click on *Usage and privacy* in the description of the *Sync facility data* section
    Then I see the *Kolibri data portal* modal with a description of what syncing does
    When I click the *Close* button
    Then the modal closes
    	And I am at *Facility > Data*

  Scenario: Successful sync to KDP
    When I click the *Sync* button
    Then I see the *Select a source* modal window
      And I see a *Kolibri Data Portal (online)* radio button (selected by default)
      And I see a *Local network or internet* radio button
    When I click the *Continue* button
    Then I see a *Syncing* message and a spinner icon
    	And the option to create a sync schedule and the *Sync* button are disabled
    When the syncing has completed successfully
    Then I see *Last sync: <time>* under the facility name

  Scenario: Successful sync with another Kolibri server on my local network or internet
    When I click the *Sync* button
    Then I see the *Select a source* modal window
      And I see a *Kolibri Data Portal (online)* radio button (selected by default)
      And I see a *Local network or internet* radio button
    When I select the *Local network or internet* radio button
    	And I click the *Continue* button
    Then I see the *Select device* modal
    	And I see the available devices
    When I select a device
    	And I click the *Continue* button
    Then I see a *Syncing* message and a spinner icon
    	And the option to create a sync schedule and the *Sync* button are disabled
    When the syncing has completed successfully
    Then I see *Last sync: <time>* under the facility name

  Scenario: Manage sync schedule
  	When I click *Create sync schedule* or *Manage sync schedule*
  	Then I see the *Sync schedules* modal
  		And I can interact with all the available options #detailed scenarios for this are available in super-admin-schedule.feature

  Scenario: Failed sync to KDP
    When I modify the options.ini file so that the variable *KOLIBRI_DATA_PORTAL_SYNCING_BASE_URL* is set to a fake URL
    	And I click *Sync*
    Then I see the *Select a source* modal window
      And I see a *Kolibri Data Portal (online)* radio button (selected by default)
      And I see a *Local network or internet* radio button
    When I click the *Continue* button
    Then I see a *Syncing* message and a spinner icon
    	And the option to create a sync schedule and the *Sync* button are disabled
    When the syncing has failed
    Then I see *Most recent sync failed* under the facility name #TO DO: currently this is not implemented

   Scenario: Failed sync with another Kolibri server on my local network or internet
   	#TO DO: currently this is not implemented
