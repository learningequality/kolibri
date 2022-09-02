Feature: Learner views practice quiz report
  Scenario: Learner views practice quiz report
    Given that I have finished and submitted the practice quiz
      And I am back on in the 'Channels' tab
      And I see my score on the same practice quiz content card
    When I click on the content card
    Then I see my practice quiz report
      And I see my score and time information
      And I see a button to retake the practice quiz
