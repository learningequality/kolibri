Feature: Admin copies a class
  Admin users need to be able to copy classes in each facility

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am at *Facility > Classes* page
      And there is at least one already created class with enrolled learners and assigned coaches

  Scenario: Copy a class with learners and coaches
    When I click on the *⋮* button for a class
    	And I click the *Copy class* option
    Then I see the *Copy class* modal
    	And I see a *Class name* field
    	And I see a *Copy of <class name>* text in the field
    	And I see a selected *Copy all learners (N)* checkbox
    	And I see an unselected *Copy all coaches (N)* checkbox
    When I enter a new class name in the *Class name* field
    	And I select both checkboxes
      And I click the *Make a copy* button
    Then the modal closes
      And I see a *Class copied successfully* snackbar message
      And I see the copied class in the *Classes* table
      And I see the correct number of coped coaches and learners

  Scenario: Copy a class without any learners and coaches
    Given I am at the *Copy class* modal
    When I enter a new class name in the *Class name* field
    	And I leave both checkboxes unchecked
      And I click the *Make a copy* button
    Then the modal closes
      And I see a *Class copied successfully* snackbar message
      And I see that none of the learners and coaches are copied

  Scenario: Copy a class with learners and coaches from the class details page
  	When I click on the class name
  	Then I see the class details page
    When I click on the *Options* drop-down
    	And I click the *Copy class* option
    Then I see the *Copy class* modal
    	And I see a *Class name* field
    	And I see a *Copy of <class name>* text in the field
    	And I see a selected *Copy all learners (N)* checkbox
    	And I see an unselected *Copy all coaches (N)* checkbox
    When I enter a new class name in the *Class name* field
    	And I select both checkboxes
      And I click the *Make a copy* button
    Then the modal closes
    	And I am back at *Facility > Classes*
      And I see a *Class copied successfully* snackbar message
      And I see the copied class in the *Classes* table
      And I see the correct number of coped coaches and learners
