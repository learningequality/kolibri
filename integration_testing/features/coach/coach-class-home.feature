Feature: General navigation on *Class home* tab

  Background:
    Given I am signed in as a class or facility coach
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
      When I click *View all*
      Then I am on *Coach > Reports > Quizzes* subtab
        And I see no quizzes

  Scenario: There are no lessons
    Given there are no created lessons
      When I look at the *Lessons* block
      Then I see no lessons
      When I click *View all*
      Then I am on *Coach > Reports > Lessons* subtab
        And I see no lessons

  Scenario: There has been no activity in the class
    Given that there has not been any learner engagement in the class
      When I look at the *Class activity* block
      Then I see *No activity in your class* notification
      When I click *View all* 
      Then I am on an empty *Class activity* page
        And I see *No activity in your class* notification

  Scenario: No coaches assigned to class
    Given there are no coaches assigned to the class
      When I look at the <class> class home summary block at the top
      Then I see no coaches listed
        And I see *-* instead

  Scenario: No learners enrolled in the class
    Given there are no learners assigned to the class
      When I look at the <class> class home summary block at the top
      Then I see *0* listed as number of learners        

  Scenario: Review progress of a started quiz
    Given there is a <quiz> quiz available
      And there has been learner progress on a <quiz> quiz
    When I click the <quiz> quiz progress bar
    Then I am on <quiz> quiz page in the *Reports* tab
      And I see high level quiz summary data
      And I see a list of learners with quiz progress

  Scenario: Review progress of a started lesson
    Given there is a <lesson> lesson available
      And there has been learner progress on a <lesson> lesson
    When I click the <lesson> lesson progress bar
    Then I am on <lesson> lesson page in the *Reports* tab
      And I see high level lesson summary data
      And I see a list of learners with lesson progress

  Scenario: Review all class activity notifications
    When I click *View all* in the *Class activity* block
    Then I am on the *Class activity* page
      And I see a history of all notifications
      And I see filters for *Resource type* and *Progress type*

  Scenario: Filter notifications by resource and progress   
    Given that I am on the *Class activity* notifications page
      When I open the *Resource type* filter
      Then I see a list of resource options
      When I open the *Progress type* filter
      Then I see a list of progress options: all, completed, started, help needed
