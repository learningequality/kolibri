Feature: Learner views time information during the practice quiz
  Scenario: Learner views the time spent on the practice quiz
    Given that I have entered the practice quiz page
    When the I start on the practice quiz
    Then I can see a time displayed as 'Time spent' above the question list
      And I can see that time increments by minutes

  Scenario: Learner views the suggested duration for the practice quiz
    Given that I have entered the practice quiz page
    When the I start the practice quiz
    Then I see a time displayed as 'Quiz duration' above the question list
