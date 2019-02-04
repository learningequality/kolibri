Feature: General navigation through plan tab

  Scenario: Navigate back to group list from a specific group
    Given that I am on a groups <group> details page
      When I click the *back arrow”
      Then I am back on the list of groups

  Scenario: Navigate back to group learner list from learner enrollment
    Given that I am on the *Enroll learners into '<group>'*  page
      When I click the back arrow
      Then I am back to <group> group page
        And I see a list of the <group> group learners

  Scenario: Navigating back to quiz list from a specific quiz
    Given that I am on the quiz details page
      When I click “Back to quizzes”
      Then I should be redirected back to the quiz list
        And I should see a list of my quizzes

  Scenario: Navigating back to lesson list from a specific lesson
    Given that I am on the lesson details page
      When I click “Back to lessons”
      Then I should be redirected back to the lessons list
        And I should see a list of my lessons

  Scenario: Navigating between plan subtabs
    Given that I am on the PLAN tab in COACH
      And Given that I am on the LESSONS subtab by default
    When I click on the QUIZZES subtab
    Then the active tab should be changed to QUIZZES tab
      And I should see my view switched to my list of quizzes
    Or if I click on the GROUPS subtab
    Then the active tab should be changed to GROUPS tab
      And I should see my view changed to my list of groups

  Scenario: Coach changes quiz list filter
    Given that I am on the quiz list
      And Given that the filter is defaulted to “All quizzes”
    When I change the filter to “Active”
    Then I should only see quizzes with an active state
    Or if I change the filter to “Inactive”
    Then I should only see quizzes with an inactive state

  Scenario: Coach changes lesson list filter
    Given that I am on the lesson list
      And Given that the filter is defaulted to “All lessons”
    When I change the filter to “Active”
    Then I should only see lessons with an active state
    Or if I change the filter to “Inactive”
    Then I should only see lessons with an inactive state
