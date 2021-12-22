Feature: Coach sees reports for practice quizzes assigned in-lesson

  Scenario: Coach views practice quiz in lesson report
    Given that I have a lesson assigned to learners
      And there is an practice quiz in the lesson
    When I go into the 'Reports > Lessons > <lesson>' tab
    Then I see the practice quiz listed in the lesson resource list

  Scenario: Coach views practice quiz progress in the lesson report
    Given that I have a lesson assigned to learners
      And there is an practice quiz in the lesson
      And learners have started to engage with the practice quiz
    When at least one learner has submitted the quiz
      And I go into the 'Reports > Lessons > <lesson>' tab
    Then I see that there is progress in the 'Progress' column of the lesson report

  Scenario: Coach views individual learner progress of the practice quiz in the quiz report
    Given that I have a lesson assigned to learners
      And there is an practice quiz in the lesson
      And learners have started to engage with the practice quiz
    When at least one learner has submitted the quiz
      And I go into the 'Reports > Lessons > <lesson> > <learner>'
    Then I see that individual learner progress on the practice quiz in a table
      And I see a subtab with difficult questions
      And I see a button that has a preview of the practice quiz
      And I see a column in the table with latest score and attempts
