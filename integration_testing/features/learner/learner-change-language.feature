Feature: Learner change language
  Learner needs to be able to change language after login from the user menu and the sidebar

  Background:
    Given that I am signed in to Kolibri as a learner user

  Scenario: Change language from the sidebar
    When I open the sidebar from the top left icon
      And I click *Change language* 
    Then I see the *Change language* modal
    When I select <language>
     And I click *Confirm* button
    Then the modal closes
      And I see Kolibri UI in <language> language

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