Feature: Coach sign-in
  Coach should be able to sign in to access Kolibri
  If the coach account is registered correctly, they should arrive at the *Coach > Classes* page upon sign-in

  Background:
    Given that I am on the Kolibri sign-in page
        And there is registered coach <username> with password <password>

  Scenario: Sign in as coach user
    When I fill out my username <username>
      And I fill out my password <password>
      And I click the *Sign in* button
    Then I am signed in and I can see the *Coach* page

Examples:
| username | password |
| coach    | coach    |
