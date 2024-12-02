Feature: Coach sees detailed information for difficult questions in practice quiz report from lessons

	Background:
    Given I am signed in to Kolibri as Coach
      And I am at *Coach - '<class>' > Lessons <lesson>* page for a practice quiz
      And a learner has already interacted with exercises in the lesson and has given repeatedly incorrect answers to some of the questions

  Scenario: Coach sees detailed information for difficult questions
    When I look at the table with resources
    Then in the *Progress* column I see *N need help*
		When I click on the title of the practice quiz
      And I click on the *Difficult questions* tab
    Then I see a table with all of the difficult questions
    When I click on the title of a difficult question
    Then I see a list of learners who got the question incorrect
    	And I see a preview of the question
    	And I see a *Show correct answer* checkbox
    When I select the *Show correct answer* checkbox
    Then I see the correct answer
