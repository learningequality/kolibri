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
      And I see the following columns in the table: *Title*, *Status*, *Learners*, *Mastery*, *Visible*

  Scenario: Coach assigns a new course
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

  Scenario: Coach can make a course visible
    Given I am at the *Coach - '<class>' > Courses* page
      And there is an assigned course that is not visible to learners
    When I toggle the *Visible* control for the course
    Then I see that the course is marked as visible
      And learners assigned to the course can see it in *Learn > Home > Classes > '<class>'*

  Scenario: Coach can make a course not visible
    Given I am at the *Coach - '<class>' > Courses* page
      And there is an assigned course that is visible to learners
    When I toggle the *Visible* control for the course
    Then I see that the course is marked as not visible
      And learners assigned to the course cannot see it in *Learn > Home > Classes > '<class>'*

  Scenario: Coach can review the course details
    When I click on the title of a course
    Then I see the course summary page
      And I see the course title and the *Options* drop-down next to it
      And I see the side panel with *Visible to learners*, *Class*, *Recipients*, *Size* and *Date assigned* values
      And I see the *Units* tab with the units table
      And I see the *Learners* and *Learner objectives* tabs to the right of it

  Scenario: Coach can modify course recipients
    Given I am at the *Coach - '<class>' > Courses* page
      And there is an assigned course
    When I open the course summary page
      And I edit the recipients of the course
    Then I can see that the recipients list is updated
      And newly added learners can access the course
      And removed learners can no longer access the course

  Scenario: Coach can start a pre-test for a unit
    Given I am at the course summary page
    When I click the *Start pre-test* button for a unit
    Then I see the *Start pre-test for Unit N* modal
    When I click the *Start pre-test* button
    Then I see that the test has been started
      And I see an *End pre-test* button

  Scenario: Coach can end a pre-test for a unit
    Given I am at the course summary page
      And there is an active test
    When I click *End pre-test* button
    Then I see the *End pre-test for Unit N* modal
      And I see the number of the learners who have completed the test and the number of learners for which the test is still in progress
    When I click the *End pre-test* button
    Then I see that the test has been ended
      And I see an *Start post-test* button

  Scenario: Coach can start a post-test for a unit
    Given I am at the course summary page
      And there's already a completed pre-test
    When I click the *Start post-test* button for a unit
    Then I see the *Start post-test for Unit N* modal
    When I click the *Start post-test* button
    Then I see that the test has been started
      And I see an *End post-test* button

  Scenario: Coach can end a post-test for a unit
    Given I am at the course summary page
      And there is an active post-test
    When I click *End post-test* button
    Then I see the *End post-test for Unit N* modal
      And I see the number of the learners who have completed the post-test and the number of learners for which the post-test is still in progress
    When I click the *End post-test* button
    Then I see that the test has been ended

  Scenario: Coach can see the learners progress and details
    Given I am at the course summary page
    When I click on the *Learners* tab
    Then I see a table with the learners to which the course is assigned
      And I see the following columns: *Learners*, *Groups* and *Risk level*
    When I click on the name of a learner
    Then I see the learner details panel
      And I can see the *Progress* section with the test averages
      And I can see the *Individual learning objective performance* table with *Learning objective* and *Correct questions* columns

  Scenario: Coach can see the learning objectives
    Given I am at the course summary page
    When I click on the *Learning objectives* tab
    Then I see a table with the units
      And I can see the mastery level for each unit
    When I click on the title of a test
    Then I can see the test details panel
      And I can see the number of learners who have completed it
      And I can see the *Individual learning objective performance* table with the progress made by each learner
