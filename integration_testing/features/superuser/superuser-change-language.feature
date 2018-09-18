Feature: Superuser change user interface language
  Superuser needs to be able to change the UI language from the user menu

  Background:
    Given I am signed in to Kolibri as superuser user

  Scenario: Superuser changes language
    When I open the user menu
      And I click *Change language*
    Then I see the *Change language* modal
    When I select <language>
     And I click *Confirm* button
    Then the modal closes
      And I see Kolibri UI in <language> language

  Scenario: Change language from the sidebar
    When I open the sidebar from the top left icon
      And I click *Change language* 
    Then I see the *Change language* modal
    When I select <language>
     And I click *Confirm* button
    Then the modal closes
      And I see Kolibri UI in <language> language

Examples:
  | language  |
  | Kiswahili |