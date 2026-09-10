Feature: Attendance tracking
  Coaches need to be able to track the attendance (English only).

	Background:
    Given I am signed in to Kolibri as a super admin, admin or a coach
      And the option *Allow coaches to take attendance (English only)* is enabled at *Facility > Settings*
    	And there is a class with enrolled learners in it
      And I am at the *Coach - '<class>' > Class home* page

	Scenario: Coach can see the Attendance card
    When I look at the *Class home* page
    Then I see the *Attendance* card at the top left part of the screen
      And I can see a *Mark attendance* button and *No attendance sessions yet* text

  Scenario: Coach can mark the attendance
    When I click the *Mark attendance* button
    Then I am at the attendance page for the current time and date
      And I see a *Search for a learner* field and a *Mark all learners present* toggle button
      And I see a list of all the learners with a *Present* toggle button for each learner
      And I see a *Cancel* and a *Submit attendance* button
    When I mark each learner as either present or absent
      And I click the *Submit attendance* button
    Then I see the new entry added in the *Attendance history* table
      And I see a snackbar confirmation message
      And I see the correct number of *Present* and *Absent* learners

  Scenario: Coach can see the Attendance card with data
    Given a coach has already taken the attendance
    When I go to the *Class home* page
    Then I see the *Attendance* card at the top left part of the screen
      And I can see a *View history* button, a *Mark attendance* button, a graph showing the ratio of present vs absent learners and the date and time above each graph

  Scenario: Coach can see the *Attendance history*
    Given a coach has already taken the attendance
    When I click the *View history* button
    Then I can see the *Attendance history* page
      And I can see a *Mark attendance* button
      And I can see a table with *Date*, *Present* and *Absent* columns
      And I can see all of the available entries

  Scenario: Coach can edit a submitted session
    Given I am at the *Attendance history* page
      And less than 24 hours have passed since submission
    When I click on the date of an attendance entry
    Then I see the *Edit attendance <date and time>* modal
      And I see the table with all of the learners and their status
      And I see a disabled *Save* button and an enabled *Cancel* button
    When I change the present status of one or several learners
      And I click the *Save* button
    Then I see a confirmation model *Save N change(s)*
    When I click *Save*
    Then I see an *Attendance updated* snackbar message
      And I am back at the *Attendance history* page
      And I can see the correct values in the *Present* and *Absent* columns

  Scenario: Coach cannot edit a submitted session if more than 24 hours have passed since submission
    Given I am at the *Attendance history* page
      And more than 24 hours have passed since submission
    When I click on an attendance entry
    Then I see the list of all the learners with a disabled *Present* radio button for each learner
      And the *Save* button is disabled

  Scenario: Coach can export a single list CSV of the attendance history
    Given I am at the *Attendance history* page
      And there is one or several submissions
    When I click the *Export as CSV* button
    Then I can export the generated CSV file to my device
    When I open the downloaded CSV file
    Then I can see that it contains the correct *Present* and *Absent* values for each date

  Scenario: Coach can print the attendance history
    Given I am at the *Attendance history* page
      And there is one or several submissions
    When I click the *Print* button
    Then I can print the generated file
      And I can see that it contains the correct *Present* and *Absent* values for each date
