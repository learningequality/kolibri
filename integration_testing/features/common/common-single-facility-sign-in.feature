Feature: Single facility sign in
  Kolibri users need to see the name of the facility they are signing into

  Background:
    Given there is only one facility on the device
      And I am on the sign in page

  Scenario: Sign in to facility
    When I open Kolibri in the browser
    Then I see *Sign in to <facility>*
      And I see the sign in form

Examples:
| facility |
| MySchool |
