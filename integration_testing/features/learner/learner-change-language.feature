Feature: Learner-change-language
  Learner change language on login page
  Learner change language after login from the user drop down menu

  Background:
    Given I am on the *User > Sign in* page

  Scenario: Learner change language on login page
    When I click *More languages* button
    Then I see list of languages
    When I select <language>
     And I click *Confirm* button
    Then I see Kolibri language changed

  Scenario: Learner change language after login from the user drop down menu
    When I sign in as Kolibri learner user
     And I am on the *Learn > Classes* page
     And I open the sidebar from the top left icon
    Then I see change language button
    When I click *Change language* button
    Then I see list of languages
    When I select <language>
     And I click *Confirm* button
    Then I see Kolibri language changed

Examples:
  | language  |
  | Kiswahili |