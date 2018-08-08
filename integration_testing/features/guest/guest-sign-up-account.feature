Feature: Guest sign up account
    Guest should be able to sign up an account
    Guest can select facility

  Background:
    Given I am on *User > Create account* page

  Scenario: Guest should be able to sign up an account
    When I fill out my full name <full_name>
     And I fill out my username <username>
     And I fill out my password <password>
     And I select my facility <facility>
     And I click the *Sign up* button 
    Then I am signed in and I can see the *Learn > Topics* page

  Examples:
  | full_name | password | username | password | facility |
  | juan .p   | learner  | juan     | pass     | school   |
