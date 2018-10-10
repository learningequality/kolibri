Feature: Super Admin setup wizard
    Super Admin needs to create their own account and perform the initial facility configuration of Kolibri through the setup wizard

  Background:
    Given that the Kolibri installation was successful
      And the server is running for the first time
      And the browser is opened at the IP address 127.0.0.1:8080

  Scenario: Select language
    Given that I am on the *Step 1 of 4* of the setup wizard
      And I see *Please select the default language for Kolibri*
    When I click the link *Español*
    Then the wizard language changes to Spanish
    When I click *More languages*
    Then I see the *Change language* modal
    When I select *Français*
      And click *Continue*
    Then the modal closes
      And I see the wizard language changes to French
    When I click the link *English*
    Then the wizard language changes to English
    When I click *Continue* button
    Then I see the *Step 2 of 4* of the setup wizard

    Scenario: Name the facility
      Given that I am on the *Step 2 of 4* of the setup wizard
        And I see *Name your Facility*
      When I input the facility name in the field
        And click *Continue*
      Then I see the *Step 3 of 4* of the setup wizard

    Scenario: Facility setup options
      Given that I am on the *Step 3 of 4* of the setup wizard
        And I see *Choose a Facility setup*
      When I click *More information about these settings*
      Then I see the *Facility setup details* modal
      When I click *Close*
      Then the modal closes
      When I select one of the options
        And click *Continue*
      Then I see the *Step 4 of 4* of the setup wizard

    Scenario: Super Admin account details
      Given that I am on the *Step 4 of 4* of the setup wizard
        And I see *Create your Admin account*
      When I fill in the full name, username and password fields
        And click *Finish*
      Then I see the page reload
        And I see the *Welcome to Kolibri* modal
      When I click *Ok*
      Then the modal closes
        And I see the *Device > Content* page
