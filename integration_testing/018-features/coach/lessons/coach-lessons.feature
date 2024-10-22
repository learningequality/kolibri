Feature: Lessons
  Coach can see the lessons assigned to the class and the learner's progress in the lesson's summary page

  Background:
    Given I am signed in as a coach
      And I am at *Coach > Lessons*
      And there are lessons with resources assigned to the class
      And there are learners who have started, completed or need help with resources

  Scenario: Lessons page overview
    When I go to *Coach > Lessons*
    Then I see the *Lessons* page
    	And I see the *New lesson* button
    	And I see the class name, the total size of lessons visible to learners, filters by status and recipients, *View learner devices* link, *Print report* and *Export as CSV* icons
    	And I see a table with all of the lessons with the following columns: *Title*, *Progress*, *Size*, *Recipients*, *Visible to learners*

  Scenario: Review lesson details
    When I click on the title of a lesson
    Then I see the lesson summary page
    	And I see the lesson title, the *Manage resources* button and the *...* button next to it
    	And I see the side panel with *Visible to learners* status, *Recipients*, *Description*, *Class*, *Size*, *Date created*
    	And I see the *Resources* tab with a table with the available lesson resources and and *Title*, *Progress* and *Average time spent* columns for each resource
    	And I see options to rearrange the order of the resources or to remove a resource
    	And I see the *Learners* tab
    When I click on the *Learners* tab
    Then I see a table with the learners
    	And I see the following columns: *Name*, *Progress*, *Groups
    	And I see the progress made by each learner

  Scenario: Review the resource progress report
  	Given I am at the lesson details page for a lesson
    When I click on a resource
    Then I see the resource progress report
    	And I see the title of the resource, class to which the resource is assigned, progress made, and average time spent
    	And I see a *View by groups* checkbox
    	And I see the learners table with *Name*, *Progress*, *Time spent*, *Groups* and *Last activity* columns
      And in the *Progress* column I see the summary icons and labels (Completed, Started, Not started, and Need help)
      And in the top right I see the *View learner devices* link, *Print report* icon, *Export as CSV* icon and a *Preview* button

  Scenario: Learner needs help with a resource
    When a learner has given 2 wrong answers in an exercise
    Then their *Progress* column states *Needs help*

  Scenario: View the resource report page by groups
    Given I am at viewing the resource progress report page
		When I click the *View by groups* checkbox
		Then I see separate tables for each available group

  Scenario: View resource preview
  	Given I am at viewing the resource progress report page
    When I click *Preview* button
    Then I can see the resource preview
    When I click the back arrow button
    Then I am back at the resource progress report page

  Scenario: Review learners progress from the *Learners* subtab
    Given that I am in the *Learners* tab of a lesson
    When I click on the name of a learner
    Then I see the name of the learner
    	And I see a table with *Title*, *Progress* and *Time spent* columns
    	And I see the lesson resources and the progress made by the learner
    	And in the top right I see the *Print report* and *Export as CSV* icons
