Feature: Learner can open and close the information panel

  Scenario: Learner can open and close the information panel
    Given that I am viewing a resource
    When I click the information icon in the top appbar
    Then I see the information panel for the resource
    	And I can see all of the available metadata
    When I click the close button in the information panel
    Then the information panel closes
