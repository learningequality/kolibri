Feature: Coach sign-in
    Coach should be able to sign in to access Kolibri Coach tab
    If the coach account is registered correctly, they should arrive at the Coach page upon sign-in

  Background:
    Given that you are on the Kolibri sign-in page

  Scenario: log in as coach account
    When you fill out your username <username>
    When you fill out your password <password>
    When you click the *Sign in* button
    Given that there is there is registered Coach <username> with password <password>
    Then You should be signed in and see the *Coach* page

