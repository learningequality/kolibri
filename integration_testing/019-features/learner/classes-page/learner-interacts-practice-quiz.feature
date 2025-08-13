Feature: Learner interacts with practice quizzes

  Background:
    Given I am enrolled in at least one class
    	And I am assigned to a lesson with practice quizzes
    	And I am at *Home > Classes > Class*

  Scenario: Learner interacts with a practice quiz and completes it
    When I click on the lesson card
    Then I see a list of ordered lesson resources which includes my practice quiz
    When I click on the practice quiz
    Then I see all of the available questions
    	And I see a *Time spent* icon at the top
    When I answer some of the questions
    	And I click the *Submit quiz* button
    Then I see the *Submit quiz* modal
    When I click the *Submit quiz* button
    Then I see the *Resource completed* modal
    When I close the *Resource completed* modal
    Then I see the practice quiz report page
      And I see the status, score, questions answered correctly, time spent and attempted time info for the quiz
      And I see a *Try again* button to retake the practice quiz
      And I see the answer history for the quiz

  Scenario: Learner retakes a practice quiz
      Given that I have just completed and submitted a practice quiz
      	And I am at the quiz report page for the practice quiz
      When I click on the *Try again* button
      Then I see that same practice quiz loaded again
      When I answer some of the questions
    	And I click the *Submit quiz* button
      Then I see the *Submit quiz* modal
      When I click the *Submit quiz* button
      Then I see the *Resource completed* modal
      When I close the *Resource completed* modal
      Then I see the practice quiz report page
       And I see the new status, score, questions answered correctly, time spent and attempted time info for the quiz
       And I see a *Try again* button to retake the practice quiz
       And I see the answer history for the quiz

  Scenario: Learner discovers practice quizzes while browsing a channel
     Given that there is a channel with a practice quiz
     When I click on the lesson card in my classes tab
     Then I see a list of ordered lesson resources which includes my practice quiz

  Scenario: Learner views the time spent on the practice quiz
     Given that I am at the practice quiz page
     When I start answering the questions in the practice quiz
     	And I click on the *Time spent* icon an the to right corner
     Then I can see the time I've spent so far
     When I close the popup.
     	And I click again on the *Time spent* icon
     Then I see that the time is incremented correctly
