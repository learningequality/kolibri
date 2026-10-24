Feature: Admin creates users
  Admin users need to be able to create user accounts for each role in the facility

  Background:
    Given I am signed in to Kolibri as a facility admin user
    	And the *Enter username and password* option is enabled at *Facility > Settings*
      And I am at *Facility > Users* page

  Scenario: Create a new learner user account
  	When I look at the *Users* page
    Then I see a *New user* button and an *Options* drop-down
      And I see the *Assign coach*, *Enroll in class*, *Remove from class* and *Delete selected users* icons
      And I see the *Search for a user* field
      And I see a *Filter* link
      And I see the user's table with the *Full name*, *Username*, *Identifier*, *Gender*, *Birth year* and *Created at* columns
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
    When I open the *Assign to a class* drop-down
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

  Scenario: Create multiple users in a row
    Given I am at the *Create new user* side panel
    	And I have filled in all the required fields
    	And I have selected the desired user type from the *User type* drop-down
    When I click the *Save and add another* button
    Then the page reloads
      And I see the *User created* snackbar message
      And the *Create new user* side panel remains open
      And the for fields are reset to their default state
    When I fill in all the required fields with the credentials of a new user
    	And I click again the *Save and add another* button
    Then the page reloads
      And I see the *User created* snackbar message
      And the *Create new user* side panel remains open
      And all the fields are reset to their default state

  Scenario: Create a new learner user account when no password is required
  	Given the *Enter username only* option is enabled at *Facility > Settings*
      And I am at the *Create new user* side panel
    When I enter the user's full name
      And I enter the username
      And I leave the default value of *Learner* for the *User type*
      And I enter *Identifier* #optional
      And I select *Birth year* and *Gender* #optional
      And I don't make a selection from the *Enroll in class* field
      And I click the *Save and close* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new learner user in the *New users* table

  Scenario: Create a new learner user account when the *Picture password* is enabled
  	Given the *Picture password* option is enabled at *Facility > Settings*
      And I am at the *Create new user* side panel
    When I enter the user's full name
      And I enter the username
      And I leave the default value of *Learner* for the *User type*
      And I enter *Identifier* #optional
      And I select *Birth year* and *Gender* #optional
      And I don't make a selection from the *Enroll in class* field
      And I click the *Save and close* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new learner user in the *New users* table
    When I click the *...* button for the user
    	And I select *Edit details*
    Then I can see the *Picture password* of the user #repeat the scenario with the standard icons enabled and with enabled icon names
