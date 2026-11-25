Feature: Learners can trigger hints to appear

  Given I am on the exercise resource page
    And hints are available for the resource

  Scenario: Learners can interact with the *Use a hint (N)* button
    When I press the *Use a hint (N)* button link
    Then the hint count should decrease by a value of 1
      And my screen pans automatically to the hint that was revealed
    When the hint count is at zero
    Then the *Use a hint (N)* button link is disabled
