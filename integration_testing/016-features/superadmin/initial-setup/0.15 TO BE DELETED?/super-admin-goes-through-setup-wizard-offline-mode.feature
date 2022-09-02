Feature: Super admin goes through the setup wizard in offline mode
  Super admin can go through the Setup Wizard in offline mode

  # In case of testing on virtual machine:
  # Make sure that your testing environment has no Internet connection (before you start the VM, go to Properties > Network > Adapter 1, and uncheck the Enable Network Adapter checkbox; try to do a Google search to confirm that the VM has no Internet access).
  # Download it on your host and unzip anywhere on your Windows 10 VM guest (Desktop should work fine). VM's Shared Folders setting should work even without the network adapter.
  # Keep both folders (Kolibri and KOLIBRI_DATA) together in the same location.
  # Open the Kolibri folder and double-click the Kolibri.exe file.

  Background:
    Given The testing environment has no active Internet connection
      And The Kolibri installation was successful
      And the server is running for the first time
      And the App is opened in the virtual machine

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

  Scenario: Select 'Advanced setup' wizard
    Given I am on the Language selection page
    When I click the Continue button on that page
    Then I see *Quick Start* and *Advanced setup* options
    When I select *Advanced setup* option
      And I click the Continue button
    Then I see the Device name page
    When I fill a device name and click Continue button
    Then I see the Create or import facility page
    When I click the New facility button
    Then The *New facility - step 1 of 6* page loads
      And I see *Non-formal* and *Formal* options for facility type
    When I select *Formal*
      And I give some name of my new facility
      And I click the Continue button
    Then The *New facility - step 2 of 6* page loads
      And I see *Enable guest access?* options
    When I select *No* and click Continue button
    Then The "New facility - step 3 of 6" page loads
      And I see the "Allow anyone to create their own learner account?" options
    When I select *No* and click Continue button
    Then The *New facility - step 4 of 6* page loads
      And I see *Enable passwords on learner accounts?* options
    When I select *No* and click Continue button
    Then The *New facility - step 5 of 6* page loads
      And I see *Create super admin account* form
    When I fill the form with valid data and click Continue button
    Then The *New facility - step 6 of 6* page loads
      And I see *Responsibilities as an administrator* text
      And I see the Finish button
    When I click the Finish button
    Then I am logged in to Kolibri
