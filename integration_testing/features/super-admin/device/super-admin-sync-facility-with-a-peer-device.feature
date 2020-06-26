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

Examples:
| facility |
| MySchool |
