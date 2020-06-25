Feature: Super admin goes through the 'Quick start' setup wizard
  Super admin can configure their device to Quick start setup

  Background:
    Given that Kolibri installation was successful
      And the server is running for the first time
      And the browser is opened at the IP address 127.0.0.1:8080

  Scenario: Select language
    Given that I am at the beginning of the setup wizard
      And I see *Please select the default language for Kolibri*
    When I click the link *Español*
    Then the wizard language changes to Spanish
    When I click *More languages*
    Then I see the *Change language* modal
    When I select *Français*
      And click *Confirmar*
    Then the modal closes
      And I see the wizard language changes to French
    When I click the link *English*
    Then the wizard language changes to English
    When I click *Continue* button
    Then I see *Getting started*

  Scenario: Select 'Quick start'
    Given I see *How are you using Kolibri?*
    When I select *Quick start*
      And I click *Continue*
    Then I see *Create super admin account*

  Scenario: Super admin account details for personal setup
    Given I see *Create super admin account*
      And I previously selected *Quick start*
      And I don't see the *Usage and privacy* link
    When I fill in the full name, username and password fields
      And I click *Finish*
    Then I see the *Setting up the facility...* page
      And I see the *Welcome to Kolibri!* modal
    When I click *OK*
    Then I see the *Device > Channels* page

  Scenario: Super admin account created in *Setup Wizard* does not see a notification to update profile
    Given I completed the Setup Wizard
      And I created my super admin account
    When I am redirected to *Device > Channels* page
    Then I don't see the *Update your profile* modal
