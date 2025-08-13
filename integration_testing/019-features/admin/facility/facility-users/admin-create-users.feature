Feature: Admin creates users
  Admin needs to be able to create user accounts for each role in the facility

  Background:
    Given I am signed in to Kolibri as a facility admin user
    	And the *Require password for learners* option is enabled at *Facility > Settings*
      And I am at *Facility > Users* page

  Scenario: Create a new learner user account
    When I click the *New user* button
    Then I see the *Create new user* side panel
    When I enter the user's full name
      And I enter the username
      And I enter the password
      And I re-enter the password
      And I leave the default value of *Learner* for the *User type*
      And I enter *Identifier* #optional
      And I select *Birth year* and *Gender* #optional
      And I don't make a selection from the *Enroll in class* field
      And I click the *Save and close* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new learner user in the *New users* table

  Scenario: Create a new learner user account and enroll the learner in a class
    Given I am at the *Create new user* side panel
    	And I have filled in all the required fields
    When I open the *Enroll in class* drop-down
      And I select a class #or multiple classes
      And I click the *Save and close* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new learner user in the *New users* table
     When I go to *Facility > Classes*
     Then I can see that the user is enrolled in the specified class(es)

  Scenario: Create a new class coach user account
    Given I am at the *Create new user* side panel
    	And I have selected *Coach* from the *User type* drop-down
    	And I have filled in all the required fields
    When I click the *Save and close* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new class coach user in the *New users* table
      And I see the *Coach* label next to the full name of the user

  Scenario: Create a new facility coach user account
    Given I am at the *Create new user* side panel
    	And I have selected *Coach* from the *User type* drop-down
    	And have selected the *Facility coach* radio-button
    	And I have filled in all the required fields
    When I click the *Save and close* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new facility coach user in the *New users* table
      And I see the *Facility coach* label next to the full name of the user

  Scenario: Create a new coach user account and assign the coach to a class
    Given I am at the *Create new user* side panel
    	And I have selected *Coach* from the *User type* drop-down #this scenario can be executed for facility coach and admin users too
    	And I have filled in all the required fields
    When I open the *Assign to class* drop-down
      And I select a class #or all/multiple classes
      And I click the *Save and close* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new coach user in the *New users* table
      And I see the *Coach* label next to the full name of the user
    When I go to *Facility > Classes*
     Then I can see that the coach is assigned in the specified class(es)

  Scenario: Create a new facility admin user account
    Given I am at the *Create new user* side panel
    	And I have selected *Admin* from the *User type* drop-down
    	And I have filled in all the required fields
    When I click the *Save and close* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new facility admin user in the *New users* table
      And I see the *Admin* label next to the full name of the user
