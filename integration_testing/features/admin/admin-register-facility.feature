Feature: Admin registers facility
  Admin needs to be able to register their facility to Kolibri Data Portal

  Background:
    Given The user is logged in as a Facility admin
      And The user has access to a Project token on Kolibri Data Portal
      And The user wants to register his/her facility to Kolibri Data Portal
      And The user is in the Data tab in the Facility plugin

  Scenario: Register to a Kolibri Data Portal project for the first time
    Given The user's facility has never been registered
      And The *Sync* button is disabled
    When The user clicks *Register*
    Then The register facility modal should appear
    When The user enters the project token from Kolibri Data Portal
    When The user clicks *Continue*
    Then The user sees a confirmation modal with the project name
    When The user clicks *Register*
    Then The modal closes
      And The user sees the green checkmark next to the Facility name

  Scenario: Register to a second Kolibri Data Portal project
    Given The user's facility has been registered before
      And The user has access to a different Kolibri Data Portal project token
    When The user clicks *Register*
    Then The register facility modal should appear
    When The user enters the project token from Kolibri Data Portal
    When The user clicks *Continue*
    Then The user sees a confirmation modal with the project name
    When The user clicks *Register*
    Then The modal closes
      And The user still sees the green checkmark next to the Facility name

  Scenario: Registration to a Kolibri Data Portal project failed
    Given The user has an invalid project token from Kolibri Data Portal
    When The user clicks *Register*
    Then The register facility modal should appear
    When The user enters the project token from Kolibri Data Portal
    When The user clicks *Continue*
    Then The user sees an invalid token error message

  Scenario: Register to a Kolibri Data Portal project, but already registered
    Given The user's facility has been registered before
    When The user clicks *Register*
    Then The register facility modal should appear
    When The user enters the same project token that was used to successfully register the facility before
    When The user clicks *Continue*
    Then The user sees a modal that says he/she has been already registered to the project
