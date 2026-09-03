Feature: Admin sign-in
  Facility admins need to be able to sign in to access Kolibri
  If the admin account is registered correctly, they will arrive at the Facility > Classes page upon sign-in

  Background:
    Given that I am at the Kolibri sign-in page
      And that there is a registered facility admin <username> with password <password>

  Scenario: Admin is able to sign-in
    When I fill in my username <username>
      And I fill in my password <password>
      And I click the *Sign in* button
    Then I am signed in
    	And I am at the *Facility > Classes* page
