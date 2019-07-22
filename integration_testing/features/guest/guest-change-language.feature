Feature: Guest changes language
  Guest needs to be able to change language on sign-in page, and from the user drop down menu while browsing content as a guest

  Background:
    Given that Kolibri is available in more than one language

  Scenario: Change language on sign-in page
    Given I am on the Kolibri sign-in page
    When I click one of the languages at the bottom of the sign-in page
    Then I see page reload
      And I see Kolibri UI language changed
    When I click *More languages* button
    Then I see the *Change language* modal
    When I select <language>
     And I click *Confirm* button
    Then the modal closes
      And I see Kolibri UI in <language> language

  Scenario: Guest has changed their own language from <device_language> to <language> prior to logging in
    When I log in
    Then Kolibri UI is in <language>
    When I open a new tab and open Kolibri
    Then Kolibri UI is shown in <language>
    When I refresh the page
    Then Kolibri UI is shown in <language>
    When I navigate the Kolibri UI
    Then Kolibri UI remains in <language>
    When I return to the sign in page and sign into any account
    Then Kolibri UI is shown in <language>
    When I open a fresh Incognito or Private Browsing window and go to Kolibri's root server URL
    Then Kolibri UI is shown in <device_language>

  Scenario: Change language from the user menu
    Given that I am browsing Kolibri content as a guest
    When I open the user menu
      And I click *Change language*
    Then I see the *Change language* modal
    When I select <language>
     And I click *Confirm* button
    Then the modal closes
      And I see Kolibri UI in <language> language

Examples:
  | language  | device_language |
  | Kiswahili | English         |
