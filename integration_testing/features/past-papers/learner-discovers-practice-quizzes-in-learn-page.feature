Feature: Learner discovers practice quizzes in Learn page

  Scenario: Learner discovers practice quizzes in assigned lessons
    Given that there is a lesson with a practice quiz assigned to my class
    When I click on the lesson card in my classes tab
    Then I see a list of ordered lesson resources which includes my practice quiz

  Scenario: Learner discovers practice quizzes while browsing a channel
    Given that there is a channel with a practice quiz
    When I click on the lesson card in my classes tab
    Then I see a list of ordered lesson resources which includes my practice quiz
