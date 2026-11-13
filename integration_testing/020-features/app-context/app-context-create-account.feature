Feature: Create an account in app context
  New user needs to be able to create an account, if permitted by the respective facility setting.

  Background:
    Given Kolibri is running in app context
      And there is one facility on the device I want to create an account on
      And that *Allow learners to create accounts* setting is activated in *Facility > Settings*
      And that I am on the Kolibri sign-in page

  Scenario: Create an account on facility where password is not required
    Given that signing in without password is enabled in the *Facility Settings*
    When I see *Sign into '<facility>'*
      And I tap the *Create an account* button
    Then I am on *Create an account* page
    When I fill in a full name
      And I fill in a username
      And I see that *Facility* is <facility>
      And I click the *Continue* button
    Then I am on the step 2 of *Create an account* page
    When I select gender and birth year #optional
      And I click the *Finish* button
    Then I am signed in and I can see the *Learn > Home* page

  Scenario: Create an account on facility where password is required
    Given that signing in without password is disabled in the *Facility Settings*
    When I see *Sign into '<facility>'*
      And I tap the *Create an account* button
    Then I am on *Create an account* page
    When I fill in a full name
      And I fill in a username
      And I fill in a password
      And I see that *Facility* is <facility>
      And I click the *Continue* button
    Then I am on the step 2 of *Create an account* page
    When I select my gender and birth year #optional
      And I click the *Finish* button
    Then I am signed in and I can see the *Learn > Home* page

  Scenario: Multiple facilities - Create an account on facility where password is not required
    Given that there is more than one facility on the device I want to create an account on # Import another facility to run these scenarios
    	And signing in without password is enabled in the *Facility Settings*
    When I see *Sign in if you have an existing account*
      And I tap the *Create an account* button
    Then I see *Select the facility* step
      And I see the list of facilities
    When I tap the <facility> button
    Then I am on *Create an account* page
    When I fill in a full name
      And I fill in a username
      And I see that *Facility* is <facility>
      And I click the *Continue* button
    Then I am on the step 2 of *Create an account* page
    When I select gender and birth year #optional
      And I click the *Finish* button
    Then I am signed in and I can see the *Learn > Home* page

  Scenario: Multiple facilities - Create an account on facility where password is required
    Given that there is more than one facility on the device I want to create an account on # Import another facility to run these scenarios
    	And signing in without password is disabled in the *Facility Settings*
    When I see *Sign in if you have an existing account*
      And I tap the *Create an account* button
    Then I see *Select the facility* step
      And I see the list of facilities
    When I tap the <facility> button
    Then I am on *Create an account* page
    When I fill in a full name
      And I fill in a username
      And I fill in a password
      And I see that *Facility* is <facility>
      And I click the *Continue* button
    Then I am on the step 2 of *Create an account* page
    When I select my gender and birth year #optional
      And I click the *Finish* button
    Then I am signed in and I can see the *Learn > Home* page

  Scenario: Username is already taken
    Given I am on the *Create an account* page
    When I try to sign up for a new account with a username that already belongs to a registered user
    Then I see the following validation message under the username field: Username already exists
    	And it's not possible to continue without changing the username
