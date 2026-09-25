Feature: User explores Kolibri without an an account

  Background:
    Given I'm a not signed in to Kolibri
    	And I am at the sign-in page
    	And the option *Allow users to explore resources without signing in* is enabled at *Device > Settings*

  Scenario: User explores a device with no imported resources
    Given there are no imported resources
    When I click the *Explore without account* link at the sign-in page
    Then I see a *No resources available* message

  Scenario: User explores a device with imported resources
    Given there are imported resources
    When I click the *Explore without account* link at the sign-in page
    Then I am at *Learn > Library*
    	And I see the available channels with resources
      And I can click on a channel to explore the available resources
