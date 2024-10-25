Feature: Learners can mark a resource as completed

  Scenario: Learner marks resource as completed
    Given that I am on the content page
    When I click the *more* ellipsis button
      And I click the *Mark resource as complete* menu option
      And I press *Confirm* in the dialog modal
    Then the resource status changes from in-progress to complete
      And a snackbar appears confirming the change
      And the *Mark resource as complete* menu option should be disabled
