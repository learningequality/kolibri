Feature: General navigation on class home interface

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
        Then there should be a quizzes block with an empty state string saying “No quizzes assigned” # Not yet implemented?
        And Then I should not see any quizzes

  Scenario: There are no lessons
    Given there are no created lessons
      Then there should be a lessons block with an empty state string saying “No lessons assigned” # Not yet implemented?
        And Then I should not see any lessons

  Scenario: There has been no activity in the class
    Given that there has not been any learner engagement in the class
      When I look at the *Class activity* block
      Then I see *No activity in your class* notification
      When I click *View all* 
      Then I am on an empty *Class activity* page
        And I see *No activity in your class* notifications

  Scenario: No coaches assigned to class
    Given there are no coaches assigned to the class yet
    When 
    Then I should not see any coaches listed in the CLASS HOME summary block at the very top of the page
      And I should see a “-” or “0” instead # Not yet implemented?

  Scenario: No learners enrolled in the class
    Given there are no learners assigned to the class yet
      When 
      Then I should not see any learners listed in the CLASS HOME summary block at the very top of the page
        And I should see a “-” or “0” instead # Not yet implemented?
        

Feature: Jumping to quizzes
    Scenario: User views progress of an in-progress quiz
        Given that I am on the CLASS HOME tab
        Given that there are quizzes available
        Given that there has been learner progress on a quiz
        When I click into a quiz’s progress bar in the quiz block
        Then I should be navigated to the quiz report for that quiz
        And I should see high level quiz summary data
        And I should also see a list of learners with quiz progress

    Scenario: User views progress of a not-started quiz
        Given that I am on the CLASS HOME tab
        Given that there are quizzes in the quiz block
        Given that there has not been learner progress on the quiz
When I click into the quiz’s progress bar     in the quiz block
Then I should be navigated to the quiz report for that quiz
And I should see a list high level quiz summary data
And I should also see a list of learners with no quiz progress

    Scenario: User clicks on “view all” quizzes
        Given that I am on the CLASS HOME tab
Given that there may or may not be any quizzes available
        When I press the button “VIEW ALL” in the quizzes block
        Then I should be navigated to the REPORTS tab
        And I should see a list of all my quizzes

        

Feature: Jumping to lessons
    Scenario: User views progress of an in-progress lesson
        Given that I am on the CLASS HOME tab
        Given that there are lessons in the lesson block
        Given that there has been learner progress on a lesson item(s)
        When I click into a lesson’s progress bar in the lesson block
        Then I should be navigated to the lesson report for that quiz
        And I should see high level lesson summary data
        And I should also see a list of lesson items with their completion
        status

    Scenario: User views progress of a not-started lesson
        Given that I am on the CLASS HOME tab
        Given that there are lessons available
        Given that there has not been learner progress on the lesson
When I click into the lesson’s progress bar in the lesson block
Then I should be navigated to the lesson report for that lesson
And I should see a list high level lesson summary data
And I should also see a list of lesson items And their progress
Status

    Scenario: User clicks on “view all” lessons
        Given that I am on the CLASS HOME tab
Given that there may or may not be any lessons available
        When I press the button “VIEW ALL” in the lessons block
        Then I should be navigated to the REPORTS tab
        And I should see a list of all my lessons

Feature: Notifications
    Scenario: User views all notifications
        Given that I am on the CLASS HOME TAB
        When I click on “VIEW ALL” in the notifications block
        Then I should be redirected to a new page with a history of all
        notifications
        And I should be able to see two filters for “resource type” And 
        “progress type”

    Scenario: User filters specific resource notifications
        Given that I am on the all notifications page
        When I click the “resource type” filter
        Then I should be able to see a list of resource options

    Scenario: User filters progress notifications
        Given that I am on the all notifications page
        When I click the “progress type” filter
        Then I should be able to see a list of four progress options;
        All, completed, started, needs help

Scenario: User clicks on a ‘started’ notification
    Given that a “started” notification just appeared in the 
    notifications block
    Given that the notification shows an in-progress icon
    When I click on that notification
    Then I should be redirected to the report page belonging to the 
    Notification
    Then I should be able to see which learners started on the
    resource


Scenario: User clicks on a ‘completed’ notification
    Given that a “completed” notification just appeared in the 
    notifications block
    Given that the notification shows an completed star icon
    When I click on that notification
    Then I should be redirected to the report page belonging to the 
    Notification
    Then I should be able to see which learners completed the resource

Scenario: User clicks on a ‘needs help’ notification
    Given that a “needs help” notification just appeared in the 
    notifications block
    Given that the notification shows a red exclamation circle icon
    When I click on that notification
    Then I should be redirected to the report page belonging to the 
    Notification
    Then I should be able to see which learners need help

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
        And Then When I click on a learner, I should see their recent
        Activity

Scenario: User clicks on a specific notification
    Given that there are notifications on the CLASS HOME tab
    When I click into a specific notification
    Then I should be redirected to the report page for that 
    Notification

Scenario: User clicks on a specific user profile in REPORTS
    Given that I am on the REPORTS tab
    When I click on a user’s name 
    Then I should be redirected to their profile where I can see 
    their recent activity
