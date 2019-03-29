Feature: Coach changes user interface language
  Coach needs to be able to change the UI language from the user menu

  Background:
    Given I am signed in to Kolibri as coach user

  Scenario: Change language from the user menu
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