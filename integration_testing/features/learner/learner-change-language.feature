Feature: Learner change language
  Learner needs to be able to change language after login from the user menu

  Background:
    Given that I am signed in to Kolibri as a learner user

  Scenario: Change language from the user menu
    When I open the user menu
      And I click *Change language*
    Then I see the *Change language* modal
    When I select <language>
     And I click *Confirm* button
    Then the modal closes
      And I see Kolibri UI in <language> language

  Scenario: Learner has changed their own language from <device_language> to <language> prior to logging in
    When I log in
    Then Kolibri is in <language>
    When I log out
    Then I am redirected to the sign in page and Kolibri is in <language>
    When I open a new tab and open Kolibri
    Then Kolibri is displayed in <language>
    When I refresh the page
    Then Kolibri is displayed in <language>
    When I navigate the Kolibri UI
    Then Kolibri remains in <language>
    When I open a fresh Incognito or Private Browsing window and go to Kolibri's root server URL
    Then Kolibri is displayed in <device_language>

Examples:
  | language  |
  | Kiswahili |
