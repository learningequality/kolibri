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
    When I click the <quiz> quiz progress bar # Not yet implemented?
    Then I am on <quiz> quiz page in the *Reports* tab
      And I see high level quiz summary data
      And I see a list of learners with quiz progress

  # Active but not started quizzes do not appear on Class home
  Scenario: Review a not-started quiz 
    Given there is a <quiz> quiz available
      And there has been no learner progress on a <quiz> quiz
    When I click the <quiz> quiz progress bar # Not yet implemented?
    Then I am on <quiz> quiz page in the *Reports* tab
      And I see high level quiz summary data
      And I see a list of learners with quiz progress

  Scenario: View all quizzes
    Given that there may or may not be any quizzes available
      When I press the *View all* button in the quizzes block
      Then I am in *Coach > Reports > Quizzes* tab
        And I see a list of all the class quizzes

  Scenario: Review progress of a started lesson
    Given there is a <lesson> lesson available
      And there has been learner progress on a <lesson> lesson
    When I click the <lesson> lesson progress bar # Not yet implemented?
    Then I am on <lesson> lesson page in the *Reports* tab
      And I see high level lesson summary data
      And I see a list of learners with lesson progress

  Scenario: Review a not-started lesson 
    Given there is a <lesson> lesson available
      And there has been no learner progress on a <lesson> lesson
    When I click the <lesson> lesson progress bar # Not yet implemented?
    Then I am on <lesson> lesson page in the *Reports* tab
      And I see high level lesson summary data
      And I see a list of lesson items with their completion status

  Scenario: View all lessons
    Given that there may or may not be any lessons available
      When I press the *View all* button in the lessons block
      Then I am in *Coach > Reports > Lessons* tab
        And I see a list of all the class lessons      

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

  Scenario: Review details of a notification
    Given that a notification just appeared in the *Class activity* notifications block
      And I can see the notification displays the in-progress, completed, or help needed icon
    When I click on the *Show* button for that notification
    Then I am on the progress report page for the resource that emitted the notification

# This does not make much sense as the user cannot arrive on the *Class home* if there are NO classes...?
Feature: No classes in facility
  Scenario: User clicks on the CLASS HOME tab
    Given that I am a coach user And there haven’t been classes made
    When I click on the CLASS HOME tab
    Then I should only see a block of notifications
    And these notifications should only display resource engagement
    And I should not see notifications pertaining to lessons or exams

  Scenario: User clicks on the REPORTS tab
    Given that I am a coach user And there haven’t been classes made
    When I click on the REPORTS Tab
    Then I should see a list of learners
    And Then When I click on a learner, I should see their recent Activity

  Scenario: User clicks on a specific notification
    Given that there are notifications on the CLASS HOME tab
    When I click into a specific notification
    Then I should be redirected to the report page for that Notification

  Scenario: User clicks on a specific user profile in REPORTS
    Given that I am on the REPORTS tab
    When I click on a user’s name 
    Then I should be redirected to their profile where I can see their recent activity
