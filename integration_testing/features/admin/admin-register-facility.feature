Feature: Admin registers facility
  Admin needs to be able to register their facility to Kolibri Data Portal

  Background:
    Given I am logged in as a Facility admin
      And I have access to a Project token on Kolibri Data Portal
      And I want to register my facility to Kolibri Data Portal
      And I am in the Data tab in the Facility plugin

  Scenario: Register to a Kolibri Data Portal project for the first time
    Given my facility has never been registered
      And the *Sync* button is disabled
    When I click *Register*
    Then the register facility modal should appear
    When I enter the project token from Kolibri Data Portal
    When I click *Continue*
    Then I see a confirmation modal with the project name
    When I click *Register*
    Then the modal closes
      And I see the green checkmark next to the Facility name

  Scenario: Register to a second Kolibri Data Portal project
    Given my facility has been registered before
      And I have access to a different Kolibri Data Portal project token
    When I click *Register*
    Then the register facility modal should appear
    When I enter the project token from Kolibri Data Portal
    When I click *Continue*
    Then I see a confirmation modal with the project name
    When I click *Register*
    Then the modal closes
      And I still see the green checkmark next to the Facility name

  Scenario: Registration to a Kolibri Data Portal project failed
    Given I have an invalid project token from Kolibri Data Portal
    When I click *Register*
    Then the register facility modal should appear
    When I enter the project token from Kolibri Data Portal
    When I click *Continue*
    Then I see an invalid token error message

  Scenario: Register to a Kolibri Data Portal project, but already registered
    Given my facility has been registered before
    When I click *Register*
    Then the register facility modal should appear
    When I enter the same project token that was used to successfully register the facility before
    When I click *Continue*
    Then I see a modal that says I am already registered to the project
