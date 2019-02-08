Feature: Coach sign-out
  Coach needs to be able to sign out when finished using Kolibri

  Background:
    Given I am signed in to Kolibri as coach user

  Scenario: Sign-out from user menu
    When I select the user menu in the top right hand corner
      And I click the *Sign out* button
    Then I am signed out and back on the sign-in page

  Scenario: Sign-out from sidebar
    When I open the sidebar from the top left icon
      And I click the *Sign out* button
    Then I am signed out and back on the sign-in page
