Feature: Super admin signs-in
    Super admin should be able to sign in to access Kolibri
    If the admin account is registered correctly, they should arrive at the *Facility > Classes* page upon sign-in

  Background:
    Given that I am on the Kolibri sign-in page
      And that there is a Super admin <username> with password <password>

  Scenario: Sign-in
    When I fill out my username <username>
      And I fill out my password <password>
      And I click the *Sign in* button 
    Then I am signed in and I can see the *Facility > Classes* page

  Examples:
  | username | password |
  | admin    | admin    |