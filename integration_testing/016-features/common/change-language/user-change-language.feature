Feature: User changes the language
  All users need to be able to change the language before or after sign-in

  Background:
    Given that the user is at the sign-in page

  Scenario: Change language at the sign-in page
    When I click one of the languages at the bottom of the sign-in page
    Then the page reloads
      And I see the Kolibri UI language changed to the selected language
    When I click the *More languages* button
    Then I see the *Change language* modal
    When I select a language
     And I click the *Confirm* button
    Then the modal closes
      And I see the Kolibri UI in the selected language

  Scenario: Change language while exploring without an account
  	Given the "Explore without account" link is visible at the sign in page
  	When I click the "Explore without account" link
  	Then I am at the *Learn > Library* page
  	When I click the sidebar icon
  	Then I see the sidebar expanded
  		And I see the *Change language* option
  	When I click the *Change language* option
  	Then I see the *Change language* modal
    When I select a language
     And I click the *Confirm* button
    Then the modal closes
      And I see the Kolibri UI in the selected language

  Scenario: Change language as a signed in user
  	Given I am signed in as a super admin, admin, coach or a learner
    When I click the sidebar icon
  	Then I see the sidebar expanded
  		And I see the *Change language* option
  	When I click the *Change language* option
  	Then I see the *Change language* modal
    When I select a language
     And I click the *Confirm* button
    Then the modal closes
      And I see the Kolibri UI in the selected language

  Scenario: Learner has changed their own language from <device_language> to <language> prior to logging in
    When I log in
    Then Kolibri is in <language> language
    When I log out
    Then I am redirected to the sign in page and Kolibri is in <language>
    When I open a new tab and open Kolibri
    Then Kolibri is displayed in <language>
    When I refresh the page
    Then Kolibri is displayed in <language>
    When I navigate the Kolibri UI
    Then Kolibri remains in <language>
    When I open a fresh Incognito or Private Browsing window and go to Kolibri's root server URL
    Then Kolibri is displayed in the specified <device_language>

Examples:
  | language  | device_language |
  | Kiswahili | English |
