Feature: Admin sign-in
  Facility admins need to be able to sign in to access Kolibri
  If the admin account is registered correctly, they will arrive at the Facility > Classes page upon sign-in

  Background:
    Given That the user is on the Kolibri sign-in page
      And That there is a registered facility admin <username> with password <password>

  Scenario: Sign-in
    When The user fills out his/her username <username>
      And The user fills out his/her password <password>
      And The user clicks the *Sign in* button
    Then The user is signed in and can see the *Facility > Classes* page

  Examples:
  | username | password |
  | admin    | admin    |
