Feature: Sync facility to Kolibri Data Portal
  When connected to the internet, users that are registered on a project in Kolibri Data Portal should be able to sync their facility data

  Background:
    Given I am signed in as a super admin
      And I am connected to the internet
      And my facility is registered to a Project on Kolibri Data Portal
      And I am in *Device > Facilities*
      And I see the list of facilities on my device

  Scenario: Sync with Kolibri Data Portal is successful
    When I click the *Sync* button on for the <facility>
    Then I see the *Select a source* modal
    When I select *Kolibri Data Portal*
      And I click *Continue*
    Then I see the list of facilities
      And I see a *Syncing* message under <facility>
      And I see an indeterminate spinner
      And I see there is a new task in *Device > Tasks*
    When the <facility> is done syncing
      Then I see a message under the <facility> *Last synced: just now*

  Scenario: Sync with Kolibri Data Portal failed
    Given a sync task is running
    When the sync fails for a <facility>
    Then I see *Failed sync: just now* under the <facility> name
      And I see *Last successfully synced: <X> <time> ago under the failed sync message


Examples:
| facility |
| MySchool |
