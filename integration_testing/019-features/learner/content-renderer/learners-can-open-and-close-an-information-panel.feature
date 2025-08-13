Feature: Learners can open and close an information panel

  Scenario: Learners can open and close information panel
    Given that I am on the content page
    When I click the information icon in the top appbar
      Then an information panel appears
    When I click the close button in the information panel
      Then the information panel closes
