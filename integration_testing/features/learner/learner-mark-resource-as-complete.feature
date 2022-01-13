Feature: Learner manually marks resource as complete
  Learner needs to be able to manually indicate they're finished with a resource

  Background:
    Given that I am signed in to Kolibri as a learner user
      And that I am viewing a resource that I have not completed

  Scenario: Marking an incomplete resource as complete
    #not yet implemented
    When I click the context menu for the resource
    Then I see an option *Mark resource as completed*
    When I click *Mark resource as completed*
    Then I see a modal window asking me to confirm my choice
    When I click *Confirm*
    Then the modal window disappears
      And I see the *Completed* icon next to the name of the resource
    When I click *Cancel*
    Then the modal window disappears
