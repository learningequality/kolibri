Feature: Guest sign up for account
    Guest should be able to sign up for an account, if permitted by respective facility setting

  Background:
    Given that *Allow learners to sign-up on this device* setting is activated on *Facility > Settings*
      And that I am on the Kolibri sign-in page

  Scenario: Sign up for an account
    When I click *Create an account* button
    Then I am on *Create an account* page
    When I fill out my full name <full_name>
     And I fill out my username <username>
     And I fill out my password <password>
     And I select my facility <facility>
     And I click the *Finish* button 
    Then I am signed in and I can see the *Learn > Channels* page

  Scenario: Username is already taken
    Given A user already exists with some username
    When I try to sign up for a new account with that username
    Then I get a validation message shown next to the username field that the name is already taken

  Examples:
  | full_name | password | username | password | facility |
  | juan .p   | learner  | juan     | pass     | school   |
