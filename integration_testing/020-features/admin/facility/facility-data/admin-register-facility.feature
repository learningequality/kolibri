Feature: Admin registers facility
  Admin needs to be able to register their facility to Kolibri Data Portal

  Background:
    Given I am logged in as a Facility admin
      And I have access to a Project token on Kolibri Data Portal
      And I am at *Facility > Data*

  Scenario: Register to a Kolibri Data Portal project for the first time
    Given my facility has never been registered
    When I click *Sync*
    Then I see the *Select a source* modal
    	And I see that *Kolibri Data Portal (online)* is the selected option
    When I click the *Continue* button
    Then I see the *Register facility* modal
    When I enter the project token from Kolibri Data Portal
    	And I click *Continue*
    Then I see a confirmation modal with the project name
    When I click *Register*
    Then the modal closes
      And I see the a spinner icon and *Syncing* under the facility name
    When the syncing has finished successfully
    Then I see a green checkmark icon next to the facility name

  Scenario: Register to a second Kolibri Data Portal project
    Given my facility has been registered before
      And I have access to a different Kolibri Data Portal project token
    When I click the *Options* button next to the *Sync* button
    	And I click the *Register* option
    Then I see the *Register facility* modal
    When I enter the project token from Kolibri Data Portal
    	And I click *Continue*
    Then I see a confirmation modal with the project name
    When I click *Register*
    Then the modal closes
      And I see a green checkmark icon next to the facility name

  Scenario: Registration to a Kolibri Data Portal project failed
    Given I have an invalid project token from Kolibri Data Portal
    When I click the *Options* button next to the *Sync* button
    	And I click the *Register* option
    Then I see the *Register facility* modal
    When I enter the invalid project token from Kolibri Data Portal
    	And I click *Continue*
    Then I see an *Invalid token* error message

  Scenario: Register to a Kolibri Data Portal project, but already registered
    Given my facility has been registered before
    When I click *Register*
    Then the register facility modal should appear
    When I enter the same project token that was used to successfully register the facility before
    	And I click *Continue*
    Then I see a modal that says I am already registered to the project
