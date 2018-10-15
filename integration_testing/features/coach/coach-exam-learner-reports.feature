Feature: Coach reviews learner reports for exams
  Coach can see the progress and score for each learner for a given exam

  Background:
    Given I am logged in as a coach
      And I am on *Coach > Classroom <classroom> > Exams > Exam <exam>* page
      And <classroom> has grouped learners
      And <classroom> has ungrouped learners

  Scenario: Report has the average score
    Given <exam> has at least one learner start or complete it
    Then The *average score* message will show the average of those learners' scores

  Scenario: Only assigned learners appear in the reports
    Given <exam> is assigned to <groups>
      Then Only learners in <groups> appear in the reports

  Scenario: Viewing reports not organized by learner groups
    Given The *View by groups* checkbox is unchecked
    Then All of the learners appear in a single report table
      And All of the learners are sorted alphabetically by their full name

  Scenario: Viewing reports organized by learner groups
    Given The *View by groups* checkbox is checked
    Then All of the learners in <groups> appear in a separate table
      And All of the groups are sorted alphabetically
      And All of the learners are sorted alphabetically by their full name

  Scenario: A learner has not started an exam
    Given A learner has not started <exam>
      And The learner has questions remaining
    Then The learner's *progress* column says "Not started"
      And The learner's *score* column is blank

  Scenario: A learner has started an exam
    Given A learner has started <exam>
      And The learner has questions remaining
    Then The learner's *progress* column shows the number of questions remaining
      And The learner's *score* column shows the current score

  Scenario: A learner has completed an exam
    Given A learner has completed <exam>
    Then The learner's *progress* column says "Completed"
      And The learner's *score* column shows the current score

Examples:
| classroom | exam    | groups         |
| My class  | My exam | group1, group2 |
