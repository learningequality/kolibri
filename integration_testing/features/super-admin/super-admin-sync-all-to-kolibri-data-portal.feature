Feature: Sync all to Kolibri Data Portal
  When connected to the internet, users that are registered to a Project in Kolibri Data Portal should be able to sync all facilities on their device at one time

  Background:
    Given I am signed in as a super admin
      And I have at least one facility on my device
      And at least one facility is registered to at least one Project on Kolibri Data Portal
      And I am in *Device > Facilities*

  Scenario: Sync all to Kolibri Data Portal is successful
    Given I am connected to the internet
    When I click the *Sync all* button
    Then I see the *Sync all facility data* modal
    When I click the *Sync* button
    Then I see the list of facilities
      And I see a *Syncing* message under <X> facilities that are registered to a Project on Kolibri Data Portal
      And I see indeterminate spinners
      And I see the *task manager* has <X> new tasks
    When all the facilities are done syncing
      Then I see a message under each synced facility *Last synced: just now*

  Scenario: Try syncing all without an internet connection
    Given I am not connected to the internet
    When I click the *Sync all* button
    Then I see the *Sync all facility data* modal
      And I see that the *Sync* button is disabled
    When I hover my mouse over the disabled *Sync* button
    Then I see a tooltip that says *You are currently offline*

  Scenario: Try syncing all when there are no facilities that are registered to Kolibri Data Portal
    Given I do not have a facility that is registered to Kolibri Data Portal on my device
    When I click the *Sync all* button
    Then I see the *Sync all facility data* modal
      And I see that the *Sync* button is disabled
    When I hover my mouse over the disabled *Sync* button
    Then I see a tooltip that says *There are no registered facilities on this device*


Examples:
| ???      | ??? |
| ?????!?! |
