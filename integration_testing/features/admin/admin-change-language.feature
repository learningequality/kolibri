Feature: Admin changes user interface language
  Admin needs to be able to change the UI language from the user menu

  Background:
    Given The user is signed in to Kolibri as facility admin user

  Scenario: Admin changes language
    When The user opens the user menu
      And The user clicks *Change language*
    Then The user sees the *Change language* modal
    When The user selects <language>
     And The user clicks *Confirm* button
    Then The modal closes
      And The user sees Kolibri UI in <language> language

  Scenario: Admin has changed their own language from <device_language> to <language> prior to logging in
    When The user logs in
    Then The user sees Kolibri UI in <language>
    When The user logs out
    Then The user is redirected to the sign in page and Kolibri is in <language>
    When The user opens a new tab and open Kolibri
    Then The user sees Kolibri UI in <language>
    When The user refreshes the page
    Then The user sees Kolibri UI in <language>
    When The user navigates between and within *Coach*, *Learn*, *Device* and *Facility* pages
    Then The user still sees Kolibri UI in <language>
    When The user opens a fresh Incognito or Private Browsing window and goes to Kolibri's root server URL
    Then The user sees Kolibri UI in <device_language>

Examples:
  | language  | device_language |
  | Kiswahili | English         |
