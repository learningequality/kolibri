Feature: Coach reviews learner reports for exams
  Coach can see the progress and score for each learner for a given exam

  Background:
    Given I am logged in as a coach
      And I am on *Coach > Classroom <classroom> > Exams > Exam <exam>* page
      And <classroom> has both grouped and ungrouped learners

  Scenario: Report has the average score
    When <exam> has at least one learner who started or completed it
    Then I see the *Average score* message withe the average of those learners' scores

  Scenario: Only assigned learners appear in the reports
    When <exam> is assigned to <groups>
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

  Scenario: A learner has not started an exam
    When a learner has not started <exam>
      And they have all the questions remaining
    Then the learner's *Progress* column says "Not started"
      And their *Score* column is blank

  Scenario: A learner has started an exam
    When a learner has started an <exam>
      And they have some of the questions remaining
    Then the learner's *Progress* column shows the number of questions remaining
      And their *Score* column shows the current score

  Scenario: A learner has completed an exam
    When a learner has completed <exam>
    Then their *Progress* column says "Completed"
      And their *Score* column shows the current score

Examples:
| classroom | exam    | groups         |
| My class  | My exam | group1, group2 |
