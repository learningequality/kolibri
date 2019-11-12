Feature: Coach reviews learner reports for quizzes
  Coach needs to be able to see the quiz report details with the progress and score for each learner

  Background:
    Given I am logged in as a coach
      And I am on *Coach - '<class>' > Reports > Quizzes* subtab
      And there is a <quiz> assigned to <class>

    Scenario: Review quiz reports
      When I click on quiz <quiz>
      Then I see the high level summary of the quiz <quiz> status
        And I see the *Report* subtab and the table with learners who are assigned the quiz <quiz>
        And I see the *Progress* and *Score* columns for each learner

    Scenario: Report has the average score
      Given that <quiz> has at least one learner who completed it
        When I look high level summary
        Then I see the *Average score* reports just the average of those learners' scores

    Scenario: Review quiz attempt report for a learner
      Given that I am on the <quiz> *Report* subtab
        When I click on the <learner> name
        Then I see the attempt report of the <learner> for each question in the <quiz>

    Scenario: Review DIFFICULT QUESTIONS subtab
      Given that I am on the <quiz> *Report* subtab
        When I click on *Difficult questions* subtab
        Then I see a list of the most difficult quiz questions

    Scenario: Review single difficult question
      Given that I am on the *Difficult questions* subtab
        When I click into a <question> question
        Then I see the *'<question>'* question page
          And I see each learner who has had trouble answering <question>

    Scenario: Review attempts by different learners on the difficult question page
      Given that I am on the difficult *'<question>'* question page
        When I click between different learner names on the sidebar
        Then I see each learner’s attempt on the <question>

    Scenario: Only assigned learners appear in the reports
      When <quiz> is assigned to <groups>
      Then only learners in <groups> appear in the reports

    Scenario: Viewing reports not organized by learner groups
      When the *View by groups* checkbox is unchecked
      Then all the learners appear in a single report table
        And all the learners are sorted alphabetically by their full name

    Scenario: Viewing reports organized by learner groups
      When the *View by groups* checkbox is checked
      Then the learners in each group appear in separate tables
        And the groups are sorted alphabetically
        And all learners are sorted alphabetically by their full name

    Scenario: A learner has not started a quiz
      When a learner has not started the <quiz>
        And they have all the questions remaining
      Then the learner's *Progress* column says *Has not started*
        And their *Score* column is blank

  Scenario: A learner has started a quiz
    When a learner has started the <quiz>
      And they have some of the questions remaining
    Then the learner's *Progress* column displays *X of Y questions answered*
      And their *Score* column is blank

  Scenario: A learner has completed a quiz
    When a learner has completed the <quiz>
    Then their *Progress* column says *Completed*
      And their *Progress* column says *N questions answered* or *All questions answered*
      And their *Score* column shows the final score


Examples:
| class    | quiz    | group  | question |
| My class | My quiz | group1 | Sumar 1  |
