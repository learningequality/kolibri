Feature: Lessons subtab
  Coach needs to be able to see the lesson report details with the progress and score for each learner 

  Background:
    Given I am logged in as a coach
      And I am on *Coach - '<class>' > Reports > Lessons* subtab
      And there is a <lesson> with a <resource> and <exercise> assigned to <class>

    Scenario: Review lesson reports
      When I click on lesson <lesson>
      Then I see the *Report* tab and the table with each lesson resource
        And I see the *Progress* and *Average time spent* columns for each resource
        
    Scenario: Review resource progress *Report* subtab
      When I click on a resource <resource>
      Then I see the table of learners
        And I see the summary icons (learners who completed, started, not started, and struggling)
        And I see engagement data (status, time spent, group, last activity) for each learner assigned the resource

    Scenario: Review progress from *Learners* subtab
        Given that I am on a lesson <lesson> details page
          When I click on the *Learners* subtab
          Then I see the table with learners who are assigned that lesson
            And I see the columns for progress on the overall lesson resources

    Scenario: Review exercise attempt report
      Given that I am on *Coach - '<class>' > Reports > Lessons > '<lesson>' > Learners* subtab
        When I click on the <learner> name
        Then I see the table with resources in the lesson <lesson>
          And I see columns with <learner> progress and time spent on each exercise or resource in the <lesson>
        When I click on <exercise> exercise
        Then I see the attempt report of the <learner> for each question in the <exercise>

  Scenario: Learner has not started a resource
    When a learner has not started <resource> or <exercise>
    Then the learner's *Progress* column states *Not started*

  Scenario: Learner has started a resource
    When a learner has started an <resource> or <exercise>
    Then the learner's *Progress* column states *Started*

  Scenario: Learner has completed a resource
    When a learner has completed <resource> or <exercise>
    Then their *Progress* column states *Completed*

  Scenario: Learner needs help with a resource
    When a learner has given 2 wrong answers in the <exercise> 
      # Clarify conditions for *Needs help*
    Then their *Progress* column states *Needs help*

Examples:
| class     | learner  | lesson         | exercise   | resource                 | 
| My class  | Marc G.  | Basic division | Divide up! | One digit division video |
