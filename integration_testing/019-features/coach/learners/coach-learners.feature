Feature: Learners

  Background:
    Given I am signed in to Kolibri as a super admin or a coach
      And I am at the *Coach - '<class>' > Learners* page
      And there are learners who have interacted with and completed lessons and quizzes

  Scenario: Learners page overview
    When I look at the *Learners* page
    Then I see the *Learners* title and class name
    	And I see the filter by recipients, *View learner devices* link, *Print report* and *Export as CSV* icons
    	And I see a table with all of the learners with the following columns: *Name*, *Groups*, *Average score*, *Exercises completed*, *Resources viewed*, *Last activity*

  Scenario: Review the learner details
    When I click on the name of a learner
    Then I see the learner summary page
    	And I see the learner's name, class, username and groups info
    	And I see the *Print report* icon
    	And I see the *Lessons completed*, *Average quiz score*, *Exercises completed* and *Resources viewed* cards
    	And I see the *Lessons assigned* and *Quizzes assigned* sections with a separate *Export as CSV* icon for each

  Scenario: Review the progress on a lesson assigned to a learner
    Given I am at the learner's details page
      And there are lessons assigned to the learner
      And the learner has interacted with resources from the lesson
    When I click on the title of a lesson
    Then I see a table with all of the lesson resources and the following columns: *Title*, *Progress* and *Time spent*
    	And in the top right corner I see a *Print report* and *Export CSV* icons

  Scenario: Review the progress on a quiz assigned to a learner
    Given I am at the learner's details page
      And there are quizzes assigned to the learner
      And the learner has started or completed a quiz
    When I click on the title of a quiz
    Then I see the quiz report page for the learner

  Scenario: Coach can export a CSV file for the assigned lessons and quizzes
  	Given I am at the learner's details page
      And there are lessons and quizzes assigned to the learner
      And the learner has interacted with resources from the lesson
      And the learner has started or completed a quiz
    When I click the *Export as CSV* icon next to the *Lessons assigned* label
  		And I save the exported CSV file to the device
  		And I open the CSV file to see the data
  	Then I see a CSV file containing the following columns: *Title*, *Progress*
  	When I click the *Export as CSV* icon next to the *Quizzes assigned* label
  		And I save the exported CSV file to the device
  		And I open the CSV file to see the data
  	Then I see a CSV file containing the following columns: *Title*, *Progress*, *Score*
