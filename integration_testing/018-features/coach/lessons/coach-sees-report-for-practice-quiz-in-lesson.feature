Feature: Coach sees reports for practice quizzes assigned in-lesson

  Background:
    Given I am signed in to Kolibri as Coach
      And I am at *Coach - '<class>' > Lessons <lesson>* page for a practice quiz
      And there are learners who have started the quiz

	Scenario: Coach views individual learner progress of the practice quiz in the quiz report
    When as a learner I submit the quiz
    Then as a coach I see that individual learner progress on the practice quiz in a table
      And I see a subtab with difficult questions
      And I see a button that has a preview of the practice quiz
      And I see a column in the table with latest score and attempts
