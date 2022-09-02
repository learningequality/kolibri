Feature: Learner retakes a practice quiz
  Scenario: Learner retakes an practice quiz
      Given that I have finished and submitted the practice quiz
        And I am back on in the 'Browse channel' or the lesson page
        And I see my score on the same practice quiz content card
        And I click on the content card
        And I see my practice quiz report
      When I click on the 'Try again' button to retake the practice quiz
      Then I see that same practice quiz
