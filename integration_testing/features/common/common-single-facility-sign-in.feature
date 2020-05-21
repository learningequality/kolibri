Feature: Single facility sign in
  Kolibri users should see their facility name when they sign in

  Background:
    Given there is only one facility on the device
      And I am on the sign in page


  Scenario: Learner signs in
    When I open Kolibri in the browser
    Then I see *Sign in to <facility>*
      And I see the sign in form
