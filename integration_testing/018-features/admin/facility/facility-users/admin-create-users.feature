Feature: Admin creates users
  Admin needs to be able to create user accounts for each role in the facility

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am at *Facility > Users* page

  Scenario: Create a learner user account
    When I click on *New user* button
    Then I see *Create new user* page
    When I enter the user's full name
      And I enter the username
      And I enter the password
      And I re-enter the password
      And I select *Learner* for the *User type*
      And I enter *Identifier* if desired
      And I select *Gender* and *Birth year* if desired
      And I click the *Save* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new learner user in the *Users* table

  Scenario: Create class coach user account
    When I click on *New user* button
    Then I see *Create new user* page
    When I enter user's full name
      And I enter the username
      And I enter the password
      And I re-enter the password
      And I select *Coach* for the *User type*
    Then I see the coach type options
    	And I see the *Class coach* option selected by default
    When I enter *Identifier* if desired
      And I select *Gender* and *Birth year* if desired
      And I click the *Save* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new coach user in the *Users* table
      And I see the *Coach* label next to the full name of the user

  Scenario: Create a facility coach user account
    When I click on *New user* button
    Then I see *Create new user* page
    When I enter user's full name
      And I enter the username
      And I enter the password
      And I re-enter the password
      And I select *Coach* for the *User type*
    Then I see the coach type options
    When I select the *Facility coach* option
      And I enter *Identifier* if desired
      And I select *Gender* and *Birth year* if desired
      And I click the *Save* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new coach user in the *Users* table
      And I see the *Facility coach* label next to the full name of the user

  Scenario: Create a facility admin user account
    hen I click on *New user* button
    Then I see *Create new user* page
    When I enter user's full name
      And I enter the username
      And I enter the password
      And I re-enter the password
      And I select *Admin* for the *User type*
      And I enter *Identifier* if desired
      And I select *Gender* and *Birth year* if desired
      And I click the *Save* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new admin user in the *Users* table
      And I see the *Admin* label next to the full name of the user
