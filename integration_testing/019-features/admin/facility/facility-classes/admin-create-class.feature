Feature: Admin creates classes
  Admin needs to be able to create classes for each facility

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am at *Facility > Classes* page

  Scenario: Create a new class
    When I click on the *New class* button
    Then I see the *Create new class* modal
    When I enter a class name
      And I click the *Save* button
    Then the modal closes
    	And I see the *Class created* snackbar message
      And I see the new class listed in the *Classes* table
