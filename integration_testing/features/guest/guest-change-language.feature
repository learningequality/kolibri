Feature: Guest change language
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

  Scenario: Change language from the user menu
    Given that I am browsing Kolibri content as a guest
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