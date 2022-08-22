Feature: Coach sign-out
  Coach needs to be able to sign out when finished using Kolibri

  Background:
    Given I am already signed in as a coach user

  Scenario: Sign out
    When I click the top left sidebar icon
    Then I see the sidebar expanded
      And I see the *Sign out* option
    When I click the *Sign out* option
    Then I am signed out
    	And I am at the default landing page #*Learn > Library* or *Sign-in*
