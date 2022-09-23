Feature: Admin imports practice quizzes on the device

  Scenario: Admin selects practice quizzes to import
    Given that I am on the selection screen for a '<channel>'
    When I scroll down to the content selection tree
    Then I can see practice quizzes
      And checkboxes to select practice quizzes
    When I select a practice quiz
    Then I see the checkbox state changed to checked state
      And I see the information about size and number of the selected quizzes
