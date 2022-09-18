Feature: Kolibri users see their user type in the dropdown user menu

  Background:
    Given I am signed in to Kolibri

  Scenario: User can see their user type
    When I click on the user dropdown on the right side of the action bar
    Then I can see my user type
