Feature: General navigation on *Class home* tab
# Do at the beginning, with an empty class, no resources or interactions

  Background:
    Given I am signed in as a class or facility coach
      And there are several classes in the facility
      And I am on *Class home* for a specific class
      And there are learners and coaches assigned to the class

  Scenario: Navigate back to the class list
    When I press the link *All classes*
    Then I am back on the class selection page
      And I see a list of all the facility classes, or those I'm assigned to (if class coach)

  Scenario: There are no quizzes and lessons
    Given there are no created quizzes and lessons
    When I look at the *Quizzes* and *Lessons* sections
    Then I see the *There are no quizzes/lessons* message

  Scenario: There has been no activity in the class
    Given that there has not been any learner engagement in the class
    When I look at the *Class activity* block
    Then I see *No activity in your class* message

  Scenario: No coaches assigned to class
    Given I am a facility coach
      And there are no coaches assigned to the class
    When I look at the class home summary section at the top
    Then I see no coaches listed
      And I see *-* instead

  Scenario: No learners enrolled in the class
    Given there are no learners enrolled in the class
    When I look at the class home summary section at the top
    Then I see *0* displayed as the number of learners
