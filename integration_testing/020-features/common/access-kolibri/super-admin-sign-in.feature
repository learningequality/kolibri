Feature: Super admin signs-in
  Super admin needs to be able to sign in to access Kolibri. If the admin account is registered correctly, they will arrive at the *Device > Channels* page upon sign-in

  Background:
    Given that Kolibri is not running in the app context
      And that I am on the Kolibri sign-in page
      And that there is a Super admin <username> with password <password>

  Scenario: Sign-in
    When I fill out my username <username>
      And I click *Continue*
    Then I see the password input field
    When I fill out my password <password>
      And I click the *Sign in* button
    Then I am signed in and I can see the *Device > Channels* page
