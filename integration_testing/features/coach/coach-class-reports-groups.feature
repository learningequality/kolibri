Feature: Groups subtab

  Scenario: Navigate into the *Groups* subtab
    Given I am on any tab inside *Coach > Reports*
      When I click the *Groups* subtab
      Then I see a table rows with groups and data columns pertaining to each group

  Scenario: Review reports for a specific group
    Given I am on the *Coach > Reports > Groups* subtab
      When I click <group> group
      Then I see the <group> profile page
        And I see high level summary data for <group>
        And I see the history of lessons and quizzes assigned to <group> in the *Reports* subtab

  # Check
  Scenario: Review progress of a quiz assigned to a group
    Given I am on the <group> profile page
      And there are quizzes assigned to it
    When I click on the <quiz> quiz assigned to <group>
    Then I see the quiz <quiz> report page for <group>
      And I see all quiz data scoped to <group>

  # Check
  Scenario: Review learner’s quiz report
    Given I am on the <quiz> report for <group> 
      When I click on <learner> learner name
      Then I see the <learner> learner individual quiz report

  # Check      
  Scenario: Review progress of a lesson assigned to a group
    Given I am on the <group> profile page
      And there are lessons assigned to it
    When I click on the <lesson> assigned to <group>
    Then I see the <lesson> report page for <group>
      And I see the <group> progress on all the <lesson> resources

  # Check
  Scenario: Review progress of group members
    Given I am on the <group> profile page
      When I click the *Members* subtab
      Then I see a list of all the members of that group
        And I see the data columns displaying resource completions, quiz averages, and number of lessons assigned

  Scenario: Review the group's activity
    Given I am on the <group> profile page
      When I click on the *Activity* subtab
      Then I see an activity feed of resources members engaged with
        And I see the *Resource type* and *Progress type* filter options
