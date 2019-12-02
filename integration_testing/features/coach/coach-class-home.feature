Feature: General navigation on *Class home* tab
# Do at the beginning, with an empty class, no resources or interactions

  Background:
    Given I am signed in as a class or facility coach
      And there is more than one class in the facility
      And I am on *Class home* for class <class>
      And there are learners and coaches assigned to the class <class>

  Scenario: Navigate back to the class list
    When I press the link “All classes”
    Then I am back on the class selection page
      And I see a list of all the facility classes, or those I'm assigned to (if class coach)

  Scenario: There are no quizzes
    Given there are no created quizzes
      When I look at the *Quizzes* block
      Then I see no quizzes
    #  When I click *View all*
    #  Then I am on *Coach '<class>' > Reports > Quizzes* subtab
    #    And I see no quizzes

  Scenario: There are no lessons
    Given there are no created lessons
      When I look at the *Lessons* block
      Then I see no lessons
    #  When I click *View all*
    #  Then I am on *Coach '<class>' > Reports > Lessons* subtab
    #    And I see no lessons

  Scenario: There has been no activity in the class
    Given that there has not been any learner engagement in the class
      When I look at the *Class activity* block
      Then I see *No activity in your class* notification
    #  When I click *View all* 
    #  Then I am on an empty *Class activity* page
    #    And I see *No activity in your class* notification

  Scenario: No coaches assigned to class
    Given I am facility coach
      And there are no coaches assigned to the class <class>
        When I look at the <class> class home summary block at the top
        Then I see no coaches listed
          And I see *-* instead

  Scenario: No learners enrolled in the class
    Given there are no learners assigned to the class
      When I look at the <class> class home summary block at the top
      Then I see *0* listed as number of learners        
