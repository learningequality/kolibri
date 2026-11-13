Feature: Coach can see and review lesson reports

  Background:
    Given I am signed in to Kolibri as Coach
      And I am at *Coach - '<class>' > Lessons*
      And there are lessons with all progress statuses
      And there are learners who have interacted with different resource types

	Scenario: Coach can review the resource progress report
  	Given I am at the lesson details page for a lesson
  		And I see the lesson title, the *Manage resources* button and the *...* button next to it
    	And I see the side panel with *Visible to learners* status (off by default), *Recipients*, *Description*, *Class*, *Size*, *Date created*
    	And I see the *Resources* tab and *Title*, *Progress* and *Average time spent* columns for each resource
    	And I see the *Learners* tab
    When I click on a resource
    Then I see the resource progress report
    	And I see the title of the resource, class to which the resource is assigned, progress made, and average time spent
    	And I see a *View by groups* checkbox
    	And I see the learners table with *Name*, *Progress*, *Time spent*, *Groups* and *Last activity* columns
      And in the *Progress* column I see the summary icons and labels (Completed, Started, Not started, and Need help)
      And in the top right I see the *View learner devices* link, *Print report* icon, *Export as CSV* icon and a *Preview* button
    When I go back to the lesson details page
    	And I click on the *Learners* tab
    Then I see a table with the learners
    	And I see the following columns: *Name*, *Progress*, *Groups
    	And I see the progress made by each learner
    When I click on the name of a learner
    Then I see a table with all of the lesson resources and the following columns: *Title*, *Progress* and *Time spent*
    	And in the top right corner I see a *Print report* and *Export CSV* icons

  Scenario: Coach can export CSV file for each page in *Coach - '<class>' > Lessons*
  	Given I am at *Coach - '<class>' > Lessons*
  	When I click the *Export as CSV* icon
  		And I save the exported CSV file to the device
  		And I open the CSV file to see the data
  	Then I see a CSV file containing all of the available lessons data in the following columns: *Title*, *Assigned to*, *Recipients*, *Not started*, *Started*, *Completed*, *Help needed*, *All learners*
  	When I click on the title of a lesson
  		And I click the *Export as CSV* icon
  		And I save the exported CSV file to the device
  		And I open the CSV file to see the data
  	Then I see a CSV file containing all of the available resources data in the following columns: *Title*, *Not started*, *Started*, *Completed*, *Help needed*, *Average time spent*
  	When I click on a resource
  		And I click the *Export as CSV* icon
  		And I save the exported CSV file to the device
  		And I open the CSV file to see the data
  	Then I see a CSV file containing all of the available learners data in the following columns: *Name*, *Progress*, *Time spent*, *Groups*, *Last activity*
  	When I go back to the lesson details page
  		And I click the *Learners* tab
  		And I click the *Export as CSV* icon
  		And I save the exported CSV file to the device
  		And I open the CSV file to see the data
  	Then I see a CSV file containing all of the available learners data in the following columns: *Name*, *Progress*, *Groups*

  Scenario: Coach can view the learners by groups
    Given I am at viewing the resource progress report page
		When I click the *View by groups* checkbox
		Then I see separate tables for each available group and for the ungrouped learners

  Scenario: Coach can preview a resource
  	Given I am at viewing the resource progress report page
    When I click *Preview* button
    Then I can see the resource preview
    When I click the back arrow button
    Then I am back at the resource progress report page

	Scenario: Coach can view the  individual learner progress for a practice quiz
    Given that as a learner I have completed and submitted a practice quiz
    When I click on the title of a practice quiz
    Then I see the individual learner progress of the practice quiz in a table
      And I see a subtab with difficult questions
      And I see a button that has a preview of the practice quiz
      And I see a column in the table with latest score and attempts
