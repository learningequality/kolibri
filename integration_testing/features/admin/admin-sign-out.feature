Feature: Admin sign-out
  Admins needs to be able to sign out when they finish using Kolibri

  Background:
    Given That the user is signed in to Kolibri

  Scenario: Sign-out from user menu
    When The user selects the user menu in the top right corner
      And The user clicks the *Sign out* button
    Then The user is signed out and back on the sign-in page

  Scenario: Sign-out from sidebar
    When The user opens the sidebar from the top left icon
      And The user clicks *Sign out*
    Then The user is signed out and back on the sign-in page
