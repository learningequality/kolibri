Feature: Super admin setup wizard
    Super admin needs to create their own account and perform the initial facility configuration of Kolibri through the setup wizard

  Background:
    Given that the Kolibri installation was successful
      And the server is running for the first time
      And the browser is opened at the IP address 127.0.0.1:8080

  Scenario: Select language
    Given that I am on the *Step 1 of 7* of the setup wizard
      And I see *Please select the default language for Kolibri*
    When I click the link *Español*
    Then the wizard language changes to Spanish
    When I click *More languages*
    Then I see the *Change language* modal
    When I select *Français*
      And click *Confirm*
    Then the modal closes
      And I see the wizard language changes to French
    When I click the link *English*
    Then the wizard language changes to English
    When I click *Continue* button
    Then I see the *Step 2 of 7* of the setup wizard

    Scenario: Facility setup options
      Given that I am on the *Step 2 of 7* of the setup wizard
        And I see *What kind of facility are you installing Kolibri in?*
      When I select *Non-formal* or *Formal* options
        But I don't write anything in the *Facility name* field
        And click *Continue*
      Then I see the error notification
      When I input something in the *Facility name* field
        And click *Continue*
      Then I see the *Step 3 of 7* of the setup wizard

    Scenario: Guest access
      Given that I am on the *Step 3 of 7* of the setup wizard
        And I see *Enable guest access?*
      When I select/change one of the options
        And click *Continue*
      Then I see the *Step 4 of 7* of the setup wizard

    Scenario: Allow sign-up
      Given that I am on the *Step 4 of 7* of the setup wizard
        And I see *Allow anyone to create their own learner account?*
      When I select/change one of the options
        And click *Continue*
      Then I see the *Step 5 of 7* of the setup wizard

    Scenario: Enable passwords
      Given that I am on the *Step 5 of 7* of the setup wizard
        And I see *Enable passwords on learner accounts?*
      When I select/change one of the options
        And click *Continue*
      Then I see the *Step 6 of 7* of the setup wizard

    Scenario: Super admin account details
      Given that I am on the *Step 6 of 7* of the setup wizard
        And I see *Create Super admin account*
      When I fill in the full name, username and password fields
        And click *Continue*
      Then I see the *Step 7 of 7* of the setup wizard

    Scenario: Privacy
      Given that I am on the *Step 7 of 7* of the setup wizard
        And I see *Responsabilities as an administrator*
      When I click the *View statement* link
      Then I see the *Usage and privacy* modal
        And I see the text of the privacy statement
      When I click *Close*
      Then the modal closes
      When I click *Finish*
      Then I see the page reload
        And I see the *Welcome to Kolibri* modal
      When I click *Ok*
      Then the modal closes
        And I see the *Device > Channels* page
