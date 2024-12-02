Feature: General navigation on *Class home* tab
	Class coaches need to be able to review the progress in class(es) they are assigned to, but not other classes in the facility.

  Background:
    Given I am signed in as a class or facility coach
      And there are several classes in the facility
      And I am on *Class home* for a specific class
      And there are learners enrolled in the class

  Scenario: Open the *Class home* page
    When I open the sidebar
      And click on *Coach > Class home*
    Then I see the *Classes* page
    	And I see a list of the classes to which I am assigned as a *Coach*
      And I cannot see any other classes in the facility
    When I click on the class name of a class
    Then I am at *Class home > <class>* page for the class
    	And I see the name of the class, the assigned coaches and the number of learners
    	And I see the *View learners* link, the *Print report* and the *Export as CSV* icons
    	And I see the *Quizzes*, *Lessons* and *Class activity* panels
    	And I can view all of the available information for the learners' progress and activities

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

  Scenario: Navigate back to the class list
    When I press the link *All classes*
    Then I am back on the class selection page
      And I see a list of all the facility classes, or those I'm assigned to (if class coach)

  Scenario: Review the progress of a started lesson
    Given there is a lesson made visible to the learners
      And there has been learner progress on a the lesson
    When I look at the lesson's card
    Then I see the title of the lesson, the progress bar, *Completed by N of N* and *N started*
    When I click the lesson's progress bar
    Then I am on the lesson page in the *Lessons* tab
      And I see a high level lesson summary data
      And I see a list of learners and the progress made

  Scenario: Review the progress of a started quiz
    Given there is a started quiz
      And there has been learner progress on the quiz
    When I click the quiz progress bar
    Then I am on the quiz page in the *Quizzes* tab
      And I see a high level quiz summary data
      And I see a list of learners and the progress made

  Scenario: Review all class activity notifications
    When I click *View all* in the *Class activity* section
    Then I am on the *Class activity* page
      And I see a history of all notifications
      And I see filters for *Resource type* and *Progress type*

  Scenario: Filter notifications by resource and progress
    Given that I am on the *Class activity* notifications page
    When I open the *Resource type* filter
    Then I see a list of resource options
    When I open the *Progress type* filter
    Then I see a list of progress options: All, Completed, Started, Help needed
    When I select a resource type and progress type
    Then I see only results for corresponding to the applied filters

  Scenario: Print the class home page
  	TO DO

  Scenario: Download the class activity
  	TO DO
