Feature: Coach courses
  Coaches need to be able to assign and manage courses.

	Background:
    Given I am signed in to Kolibri as a super admin, an admin or a coach
    	And there are imported channels with resources and exercises on the device
    	And there is a class with enrolled learners in it
      And I am at the *Coach - '<class>' > Courses* page

	Scenario: Courses page overview when there are no assigned courses
    Given there are no imported channels with resources and exercises on the device
    When I go to *Coach > Courses*
    Then I see the *Courses* page
    	And I see the *Assign course* button
    	And I see the disabled *Status* and *Recipients* drop-downs, and a *Search* field
      And I see the *You do not have any courses assigned Get started by assigning a course to your learners* text
      And I see an *Assign course* button below it

	Scenario: Courses page overview when there are assigned courses
    Given there are imported channels with resources and exercises on the device
    When I go to *Coach > Courses*
    Then I see the *Courses* page
      And I see the *Assign course* button
      And I see the enabled *Status* and *Recipients* drop-downs, a *Search* field and a *Clear all* button
      And I see the table with courses
      And I see the following columns in the table: *Title*, *Progress*, *Recipients*, *Learner progress*, *Visible to learners*

  Scenario: Coach can assign a new course
  	When I click the *Assign course* button
    Then I see the *Select course to assign* side panel
    	And I see a *Search by keyword* field
      And I see all of the available courses
    When I select a course
      And I click the *Select recipients* button
    Then I see the *Select recipients* panel
      And I see the title of the course
      And I see an *Entire class* radio button
      And I see a *Groups* section with all available groups
      And I see the *Individual learners* section
      And I see a *Search learners or groups...* field
      And I see a table with the individual learners
    When I select one or several of the available options
      And I click the *Assign course* button
    Then I see the *Course is assigned!* modal
    When I click the *Close* button
    Then I am back at the *Courses* page
      And I can see the newly assigned course listed in the *Courses* table

  Scenario: Coach can make a course visible to learners
    Given I am at the *Coach - '<class>' > Courses* page
      And there is an assigned course that is not visible to learners
    When I toggle the *Visible to learners* control for the course
    Then I see a *Course is now visible to learners* snackbar message
      And learners assigned to the course can see it at *Learn > Home > Classes > '<class>'*

  Scenario: Coach can make a course not visible to learners
    Given I am at the *Coach - '<class>' > Courses* page
      And there is an assigned course that is visible to learners
    When I toggle the *Visible to learners* control for the course
    Then I see a *Course is now hidden from learners* snackbar message
      And learners assigned to the course cannot see it at *Learn > Home > Classes > '<class>'*

  Scenario: Coach can see the course summary page
    When I click on the title of a course
    Then I see the course summary page
      And I see the course title and the *Options* drop-down next to it
      And I see the side panel with *Visible to learners*, *Class*, *Recipients*, *Size* and *Date assigned* values
      And I see the *Units* tab with the units table
      And I see the *Learners* and *Learning objectives* tabs to the right of it

  Scenario: Coach can see the course details
  	Given I am at the course summary page
  	When I click the *Options* button
  		And I click the *Course details* option
  	Then I see the course details side panel
  		And I see the title of the course, number of units and resources, thumbnail and description
  		And I can see a *Preview* button
  		And I can see a *Course content* section
  	When I click the *Preview* button
  	Then I see all of the available folders
  		And I can browse through the available resources

  Scenario: Coach can edit the course recipients
    Given I am at the course summary page
  	When I click the *Options* button
  		And I click the *Edit recipients* option
  	Then I can see the *Select recipients* side panel
  	When I make some changes
  		And I click the *Assign course* button
    Then I see a *Changes saved* snackbar message
    	And I can see that the recipients list is updated
      And newly added learners can access the course
      And removed learners can no longer access the course

  Scenario: Coach can delete a course
    Given I am at the course summary page
  	When I click the *Options* button
  		And I click the *Delete* option
  	Then I see the *Delete course* modal
  	When I click the *Delete* button
  	Then I see a *Course deleted* snackbar message
  		And I am back at the *Coach - '<class>' > Courses* page
  		And the deleted course is no longer listed in the *Courses* table
  		And the deleted course can no longer be accessed by learners

  Scenario: Coach can start and end a pre-test for a unit
    Given I am at the course summary page
    When I click the *Start pre-test* button for a unit
    Then I see the *Start pre-test for Unit N?* modal
    When I click the *Start pre-test* button
    Then I see a *Pre-test started for Unit N: <unit title>* snackbar message
    	And I see an *Active unit* icon with *0 of N learners completed* text next to it
      And I see an *End pre-test* button
		When I click the *End pre-test* button
    Then I see the *End pre-test for Unit N?* modal
      And I see the number of the learners who have completed the test and the number of learners for whom the test is still in progress #currently not implemented
    When I click the *End pre-test* button
    Then I see a *Pre-test ended for Unit N: <unit title>* snackbar message
    	And I see an *Active unit* icon with *N of N learners completed* text next to it
      And I see a *Start post-test* button

  Scenario: Coach can start and end a post-test for a unit
    Given I am at the course summary page
      And there's already a completed pre-test
    When I click the *Start post-test* button for a unit
    Then I see the *Start post-test for Unit N?* modal
    When I click the *Start post-test* button
    Then I see a *Post-test started for Unit N: <unit title>* snackbar message
    	And I see an *Active unit* icon with *N of N learners completed* text next to it
      And I see an *End post-test* button
		When I click the *End post-test* button
    Then I see the *End post-test for Unit N?* modal
      And I see the number of the learners who have completed the post-test and the number of learners for whom the post-test is still in progress #currently not implemented
    When I click the *End post-test* button
    Then I see a *Post-test ended for Unit N: <unit title>* snackbar message
    	And I see the unit moved into the *Completed units* section of the *Units* tab

  Scenario: Coach can see the learners progress and details
    Given I am at the course summary page
    	And there are learners who have completed a pre/post-test
    When I click on the *Learners* tab
    Then I see a table with the learners to whom the course is assigned
      And I see the following columns: *Learner*, *Unit progress* and *Groups*
    When I click on the name of a learner
    Then I see the learner details panel
    	And I can see whether the learner is on track or needs support
      And I can see the *Individual learning objective performance* table with *Learning objective* and *Correct questions* columns

  Scenario: Coach can see the learning objectives
    Given I am at the course summary page
    	And there are learners who have completed a pre/post-test
    When I click on the *Learning objectives* tab
    Then I see a table with the units
      And I can see the mastery level for each unit
    When I click on the title of a question
    Then I can see the question details panel
      And I can see the test averages
      And I can see the *Individual learning objective performance* table with the progress made by each learner
