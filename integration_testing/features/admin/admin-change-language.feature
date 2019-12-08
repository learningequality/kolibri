Feature: Admin changes user interface language
  Admin needs to be able to change the UI language from the user menu

  Background:
    Given I am signed in to Kolibri as facility admin user

  Scenario: Admin changes language
    When I open the user menu
      And I click *Change language*
    Then I see the *Change language* modal
    When I select <language>
     And I click *Confirm* button
    Then the modal closes
      And I see Kolibri UI in <language> language

  Scenario: Admin has changed their own language from <device_language> to <language> prior to logging in
    When I log in
    Then I see Kolibri UI in <language>
    When I log out
    Then I am redirected to the sign in page and Kolibri is in <language>
    When I open a new tab and open Kolibri
    Then I see Kolibri UI in <language>
    When I refresh the page
    Then I see Kolibri UI in <language>
    When I navigate between and within *Coach*, *Learn*, *Device* and *Facility* pages
    Then I still see Kolibri UI in <language>
    When I open a fresh Incognito or Private Browsing window and go to Kolibri's root server URL
    Then I see Kolibri UI in <device_language>

Examples:
  | language  | device_language |
  | Kiswahili | English         |
