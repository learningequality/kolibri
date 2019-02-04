Feature: General navigation through plan tab

  Scenario: Navigate back to group list from a specific group
    Given that I am on a groups <group> details page
      When I click the *back arrow”
      Then I am back on the list of groups

  Scenario: Navigate back to group learner list from learner enrollment
    Given that I am on the *Enroll learners into '<group>'* page
      When I click the back arrow
      Then I am back to <group> group page
        And I see a list of the learners in the <group> group

  Scenario: Navigating back to quiz list from a specific quiz
  # Not yet implemented?
    Given that I am on the quiz details page
      When I click “Back to quizzes”
      Then I should be redirected back to the quiz list
        And I should see a list of my quizzes

  Scenario: Navigating back to lesson list from a specific lesson
  # Not how things work in 0.12.alpha, lesson details are rendered inside the *Lessons* tab, so to go back to the list of lessons, one has to click on the tab itself
    Given that I am on the lesson details page
      When I click “Back to lessons”
      Then I should be redirected back to the lessons list
        And I should see a list of my lessons

  Scenario: Navigating between subtabs inside *Coach > Plan*
    Given that I am in the *Coach > Plan > Lessons* tab
      And I see the list of lessons
    When I click on the *Quizzes* subtab
    Then the *Quizzes* subtab is the active tab
      And I see the list of quizzes
    When I click on the *Groups* subtab
    Then the *Groups* subtab is the active tab
      And I see the list of groups

  Scenario: Filter quizzes
    Given that I am in the *Coach > Plan > Quizzes* tab
      And that the filter by default is “All quizzes”
    When I change the filter to “Active”
    Then I see only active quizzes
    When I change the filter to “Inactive”
    Then I see only inactive quizzes

  Scenario: Filter lessons
    Given that I am in the *Coach > Plan > Lessons* tab
      And the filter by default is “All lessons”
    When I change the filter to “Active”
    Then I see only active lessons
    When I change the filter to “Inactive”
    Then I see only inactive lessons
