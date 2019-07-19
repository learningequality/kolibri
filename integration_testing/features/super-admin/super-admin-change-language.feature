Feature: Super admin change user interface language
  Super admin needs to be able to change the UI language from the user menu

  Background:
    Given I am signed in to Kolibri as super admin user

  Scenario: Super admin has changed language from <device_language> to <language> prior to logging in
    When I log in
    Then Kolibri is in <language>
    When I log out
    Then I am redirected to the sign in page and Kolibri is in <language>
    When I open a new tab and open Kolibri
    Then Kolibri is shown in <language>
    When I refresh the page
    Then Kolibri is shown in <language>
    When I navigate between and within Coach, Learn, Device and Facility sections of Kolibri
    Then Kolibri remains in <language>
    When I close my browser altogether and go to Kolibri's root server URL
    Then Kolibri is shown in <device_language>

  Scenario: Super admin changes language
    When I open the user menu
      And I click *Change language*
    Then I see the *Change language* modal
    When I select <language>
     And I click *Confirm* button
    Then the modal closes
      And I see Kolibri UI in <language> language

Examples:
  | language  |
  | Kiswahili |
