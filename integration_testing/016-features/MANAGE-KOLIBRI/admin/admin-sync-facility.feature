Feature: Admin syncs facility
  Admin needs to be able to sync their facility data to Kolibri Data Portal

  Background:
    Given I am logged in as a Facility admin
      And my facility has been registered before
      And I want to sync my facility data to Kolibri Data Portal
      And I am in the Data tab in the Facility plugin

  Scenario: Learn what sync does
    When I click on *Usage and privacy* in the description of the *Sync facility data* section
    Then I see a modal with a description of what sync does

  Scenario: Successful sync
    When I click *Sync*
    Then I see an indeterminate loading spinner under the facility name
      And I see *Syncing* next to the spinner
    When syncing successfully completes
    Then I see *Last successful sync: Just now* underneath the facility name

  Scenario: Failed sync
    When I set KOLIBRI_DATA_PORTAL_SYNCING_BASE_URL to a fake URL so the sync will fail
    And I click *Sync*
    Then I see *Most recent sync failed* underneath the facility name
