Feature: Admin sign-in
  Facility admins need to be able to sign in to access Kolibri
  If the admin account is registered correctly, they will arrive at the Facility > Classes page upon sign-in

  Background:
    Given that I am on the Kolibri sign-in page
      And that there is a registered facility admin <username> with password <password>

  Scenario: Sign-in
    When I fill out my username <username>
      And I fill out my password <password>
      And I click the *Sign in* button
    Then I am signed in and I can see the *Facility > Classes* page

  Examples:
  | username | password |
  | admin    | admin    |
