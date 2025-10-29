Feature: User sign-out
    Users need to be able to sign out when finished using Kolibri
    Also important for correct progress tracking of individual learners

  Background:
    Given I am already signed in as a super admin, admin, coach or a learner

  Scenario: Sign out
    When I click the top left sidebar icon
    Then I see the sidebar expanded
      And I see the *Sign out* option
    When I click the *Sign out* option
    Then I am signed out
    	And I am at the default landing page #*Learn > Library* or *Sign-in*
