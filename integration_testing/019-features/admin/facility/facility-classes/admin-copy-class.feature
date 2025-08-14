Feature: Admin copies a class
  Admin users need to be able to copy classes in each facility

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am at *Facility > Classes* page
      And there is at least one already created class

  Scenario: Copy a class
    When I click on the *…* button for a class
    	And I click the *Copy class* option
    Then I see the *Copy class* side panel
    	And I see a *Class name* field
    	And I see a *Copy of <class name>* text in the field
    	And I see the *Coaches assigned to this class* section
    	And I see a search field
    	And I see all of the available coaches
    	And I see that the coaches which are already assigned to the class are selected
    When I enter a new class name in the *Class name* field
    	And I select one or several coaches from the *Coaches assigned to this class* section
      And I click the *Copy class* button
    Then the side panel closes
      And I see a *Class copied successfully* snackbar message
      And I see the copied class in the *Classes* table

  Scenario: Search for a coach while copying a class
  	Given I have already opened the *Copy class* side panel
  		And there are multiple available coaches
  	When I search for a coach by entering the coach name in the search field
  	Then I see only the matching coach names
  	When I click the *x* button to the right of the search field
  	Then the entered keyword is removed
  		And I see all of the available coaches
  	When I enter a keyword for which there are no matches
  	Then I see a *No results* text
