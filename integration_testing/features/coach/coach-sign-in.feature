Feature: Coach sign-in
    Coach should be able to sign in to access Kolibri Coach tab
    If the coach account is registered correctly, they should arrive at the *Coach* page upon sign-in

  Background:
    Given that I'm on the Kolibri sign-in page

  Scenario: log in as coach account
    When I fill out your username <username>
    When I fill out your password <password>
    When I click the *Sign in* button
    Given that there is registered Coach <username> with password <password>
    Then I should be signed in and see the *Coach* page

Examples:
| username | password |
| coach    | coach    |
