Feature: General navigation on *Class home* tab
# Do after various interactions with learner users

  Background:
    Given I am signed in as a class or facility coach
      And I am on the *Class home* page for a class
      And there are learners and coaches assigned to the class

  Scenario: Review the progress of a started quiz
    Given there is a started quiz
      And there has been learner progress on the quiz
    When I click the quiz progress bar
    Then I am on the quiz page in the *Reports* tab
      And I see a high level quiz summary data
      And I see a list of learners and the progress made

  Scenario: Review the progress of a started lesson
    Given there is a lesson made visible to the learners
      And there has been learner progress on a the lesson
    When I click the lesson's progress bar
    Then I am on the lesson page in the *Reports* tab
      And I see a high level lesson summary data
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
