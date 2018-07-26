Feature: Coach sign-in
    Coach should be able to sign in to access Kolibri
    If the coach account is registered correctly, they should arrive at the *Coach* page upon sign-in

  Background:
    Given that I am on the Kolibri sign-in page

  Scenario: Sign in as coach user
    When I fill out my username <username>
    When I fill out my password <password>
    When I click the *Sign in* button
    Given that there is registered Coach <username> with password <password>
    Then I am signed in and I can see the *Coach* page

Examples:
| username | password |
| coach    | coach    |