Feature: Admin syncs facility
  Admin needs to be able to sync their facility data to Kolibri Data Portal

  Background:
    Given The user is logged in as a Facility admin
      And The user's facility has been registered before
      And The user wants to sync his/her facility data to Kolibri Data Portal
      And The user is in the Data tab in the Facility plugin

  Scenario: Learn what sync does
    When The user clicks on *Usage and privacy* in the description of the *Sync facility data* section
    Then The user sees a modal with a description of what sync does

  Scenario: Successful sync
    When The user clicks *Sync*
    Then The user sees an indeterminate loading spinner under the facility name
      And The user sees *Syncing* next to the spinner
    When Syncing successfully completes
    Then The user sees *Last successful sync: Just now* underneath the facility name

  Scenario: Failed sync
    When The user sets KOLIBRI_DATA_PORTAL_SYNCING_BASE_URL to a fake URL so the sync will fail
    And The user clicks *Sync*
    Then The user sees *Most recent sync failed* underneath the facility name
