Feature: Learners subtab

  Scenario: Navigate into the *Learners* subtab
    Given I am on any tab inside *Coach - '<class>' > Reports*
      When I click the *Learners* subtab
      Then I see the list of learners currently enrolled in the class
        And I see the columns with progress data for each learner
 
  Scenario: Review reports for a specific learner
      Given I am on the *Coach - '<class>' > Reports > Learners* subtab
        When I click on the name of the learner <learner>
        Then I see the learner <learner> profile
          And I see their high level summary data
          And I see *Reports* and *Activity* subtabs
          And I see the history of lessons and quizzes assigned to them in the *Reports* subtab

  Scenario: Review progress of a quiz assigned to a learner
    Given I am on the learner <learner> profile
      And there are quizzes assigned to them
    When I click on the <quiz> quiz assigned to <learner>
    Then I see the quiz <quiz> report page for <learner>
      And I see all quiz data scoped to <learner>
     
  Scenario: Review progress of a lesson assigned to a learner
    Given I am on the learner <learner> profile
      And there are lessons assigned to them
    When I click on the <lesson> assigned to <learner>
    Then I see the <lesson> report page for <learner>
      And I see the learner’s progress on all the <lesson> resources

  Scenario: Review the learner's activity
    Given I am on the learner <learner> profile
      When I click on the *Activity* subtab
      Then I see an activity feed of resources that they engaged with
        And I see the *Resource type* and *Progress type* filter options
