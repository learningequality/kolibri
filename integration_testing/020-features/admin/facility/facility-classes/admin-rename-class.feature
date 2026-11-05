Feature: Admin renames a class
  Admin users need to be able to rename classes in each facility

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am at the *Facility > Classes* page
      And there is at least one already created class

  Scenario: Rename a class
    When I click on the *⋮* button for a class
    	And I click the *Rename* option
    Then I see the *Rename class* modal
    	And I see a *Class name* field
    	And I see a *<class name>* text in the field
    When I enter a new class name in the *Class name* field
      And I click the *Save* button
    Then the modal closes
      And I see a *Class renamed* snackbar message
      And I see the renamed class in the *Classes* table

  Scenario: Rename a class while managing the class coaches and learners
  	Given I am at the class page
    When I click on the *Options* drop-down
    	And I click the *Rename class* option
    Then I see the *Rename class* modal
    	And I see a *Class name* field
    	And I see a *<class name>* text in the field
    When I enter a new class name in the *Class name* field
      And I click the *Save* button
    Then the modal closes
      And I see a *Class renamed* snackbar message
      And I see the new class name
