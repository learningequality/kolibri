Feature: Learner sign-in
    Learners should be able to sign in to access Kolibri
    If the simplified sign-in setting is on, learner should be able to login only with the username
    If the learner account is registered correctly, they should arrive at the Learn > Classes page upon sign-in

  Background:
    Given that you are on the Kolibri sign-in page

  Scenario: Normal sign-in
    When you fill out your username <username>
    When you fill out your password <password>
    When you click the *Sign in* button 
    Given that there is there is registered learner <username> with password <password>
    Then You should be signed in and see the *Learn > Classes* page

  Scenario: Simplified sign-in
    Given that simplified sign-in facility setting is on
    When you fill out your username <username>
    When you click the *Sign in* button 
    Given that there is there is registered learner <username>
    Then You should be signed in and see the *Learn > Classes* page

  Examples:
  | username | password |
  | learner  | learner  |
