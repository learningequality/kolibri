Feature: Admin change user interface language
  Admin needs to be able to change the UI language from the user menu

  Background:
    Given I am signed in to Kolibri as an admin user

  Scenario: Superuser changes language
    When Open the user menu
      And I click *Change language*
    Then I see the *Change language* modal
    When I select <language>
     And I click *Confirm* button
    Then the modal closes
      And I see Kolibri UI in <language> language

Examples:
  | language  |
  | Kiswahili |