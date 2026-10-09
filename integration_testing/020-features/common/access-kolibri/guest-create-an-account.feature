Feature: Guest creates an account
  Guest should be able to create an account, if permitted by respective facility setting

  Background:
    Given that *Allow learners to create accounts* setting is activated in *Facility > Settings*
      And I am on the Kolibri sign-in page

  Scenario: Create an account
    When I click the *Create an account* button
    Then I am on *Step 1 of 2 > Create an account* page
    When I fill in my full name <full_name>
     And I fill in my username <username>
     And I fill in my password <password>
     And I select my facility <facility>
     And I click the *Continue* button
    Then I am on *Step 2 of 2 > Create an account* page
    When I select my gender and birth year if I so chose
      And I click the *Finish* button
    Then I am signed in and I can see the *Learn > Home* page

  Scenario: Username already exists
    Given a user already exists with some username
      When I try to sign up for a new account with that same username
      Then I see a *Username already exists* validation message shown under the username field

  Scenario: Sign in if you have an existing account
  	Given I am either on *Step 1 of 1 > Create an account* page or on *Step 1 of 2 > Create an account* page
  	When I click the *Sign in if you have an existing account* link
  	Then I am back at the sign-in page
