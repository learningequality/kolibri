Feature: Coach sign-in
  Coach need to be able to sign in to access Kolibri
  If the coach account is registered correctly, they should arrive at the *Coach > Classes* page upon sign-in

  # scenario valid for 'desktop' mode on all OSes; make sure to separately test the app-mode sign in

  Background:
    Given that I am at the Kolibri sign-in page
        And there is a registered coach <username> with password <password>

  Scenario: Sign in as a coach user
    When I fill in my username <username>
      And I fill in my password <password>
      And I click the *Sign in* button
    Then I am signed in and I can see the *Coach > Class home* page
