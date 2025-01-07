Feature: Learners

  Background:
    Given I am signed in to Kolibri as a super admin or a coach
      And I am at the *Coach - '<class>' > Learners* page

  Scenario: Learners page overview
    When I look at the *Learners* page
    Then I see the *Learners* title and class info
    	And I see the filter by recipients, *View learner devices* link, *Print report* and *Export as CSV* icons
    	And I see a table with all of the learners with the following columns: *Name*, *Groups*, *Average score*, *Exercises completed*, *Resources viewed*, *Last activity*

  Scenario: Review the learner details
    When I click on the name of a learner
    Then I see the learner summary page
    	And I see the learner's name, class, username and groups info
    	And I see the *Print report* icon
    	And I see the *Lessons completed*, *Average quiz score*, *Exercises completed* and *Resources viewed* cards
    	And I see the *Lessons assigned* and *Quizzes assigned* sections with a separate *Export as CSV* icon for each

  Scenario: Review the progress on a quiz assigned to a learner
    Given I am at the learner's details page
      And there are quizzes assigned to the learner
    When I click on the title of a quiz
    Then I see the quiz report page for the learner

  Scenario: Review the progress on a lesson assigned to a learner
    Given I am at the learner's details page
      And there are lessons assigned to the learner
    When I click on the title of a lesson
    Then I see the lesson report page for the learner
