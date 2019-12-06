Feature: General navigation through the *Plan* tab

  Scenario: Navigate back to group list from a specific group
    Given that I am on a groups <group> details page
      When I click the *(back arrow) All groups*
      Then I am back on the list of groups

  Scenario: Navigate back to group list from the learner enrollment page
    Given that I am on the *Enroll learners into '<group>'* page
      When I click the *back arrow*
      Then I am back to <group> group page
        And I see a list of the learners in the <group> group

  Scenario: Navigating back to quiz list from a specific quiz
    Given that I am on the quiz <quiz> details page
      When I click *(back arrow) All quizzes*
      Then I see *Plan > Quizzes* page again
        And I see the list of all <class> quizzes

  Scenario: Navigate back to lesson list from a specific lesson
    Given that I am on a lesson details page
      When I click “Lessons” tab
      Then I am back to the lessons list

  Scenario: Navigating between subtabs inside *Coach - '<class>' > Plan*
    Given that I am in the *Coach - '<class>' > Plan > Lessons* subtab
      And I see the list of lessons
      When I click on the *Quizzes* subtab
      Then the *Quizzes* subtab is the active tab
        And I see the list of quizzes
      When I click on the *Groups* subtab
      Then the *Groups* subtab is the active tab
        And I see the list of groups

#  Scenario: Filter quizzes
#    Given that I am in the *Coach - '<class>' > Plan > Quizzes* tab
#      And that the filter by default is “All quizzes”
#    When I change the filter to “Active quizzes”
#    Then I see only active quizzes
#    When I change the filter to “Inactive quizzes”
#    Then I see only inactive quizzes

#  Scenario: Filter lessons
#    Given that I am in the *Coach - '<class>' > Plan > Lessons* tab
#      And the filter by default is “All lessons”
#    When I change the filter to “Active lessons”
#    Then I see only active lessons
#    When I change the filter to “Inactive lessons”
#    Then I see only inactive lessons
