Feature: Admin can delete classes
  Admin users need to be able to delete classes from the facility

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am at the *Facility > Classes* page
      And there is a class created in the facility

  Scenario: Delete class
    When I click on the *…* button for a class
    	And I click the *Delete class* option
    Then I see the *Delete class* modal
    When I click the *Delete* button
    Then the modal closes
    	And I see a *Class deleted* snackbar message
      And I see that the deleted class is no longer displayed in the *Classes* table
