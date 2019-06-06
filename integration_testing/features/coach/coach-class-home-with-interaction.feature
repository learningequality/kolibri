Feature: General navigation on *Class home* tab
# Do after various interactions with learner users

  Background:
    Given I am signed in as a class or facility coach
      And I am on *Class home* for class <class>
      And there are learners and coaches assigned to the class <class>    

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
