Feature: Admin bulk export of users and classrooms
  Admin needs to be able to import users and their classrooms

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am on *Facility > Data* page

  Scenario: See CSV file format needed to import users
    When I click on "Import" button under *Import and export users* heading
    Then I see a new window with a text explaining the consequences of importing
    When I click on the *View spreadsheet format reference* link
    Then I a new modal window appears with the format of every field in the CSV file, if it's required or not and its validation rules

  Scenario: Massive import of users from a csv file
    When I click on "Import" button under *Import and export users* heading
    Then I see a new window with a text explaining the consequences of importing
    Then I see one enabled button with the text *Cancel*
      And I see one disabled button with the text *Next*
    Then I click on the *Browse* button and select a csv file with the right format
    Then I click on the *Open* (or similar, depending on the browser) button
    Then I see the *Next* button is enabled
      And I click on it
    Then I see a new window with the title *Import users* and the loading indicator
    Then after some seconds I see a report of the errors found and a list of the Users and Classes that are going to be updated and created
      And two buttons with the text *BACK* and *IMPORT*
    Then I click on the *IMPORT* button
      And I see the loading indicator again
    Then after some seconds the window show a *SUCCESS* message and a report with the changes made in the database
    Then I click on the X at the top left to close this modal window
      And I click on the *Classes* top menu
    Then I check that classes match what the csv file contained, including enrolled learners and assigned coaches

CSV file content example (for the first row, texts not inside parenthesis may be translated) :
Username (USERNAME),Password (PASSWORD),Full name (FULL_NAME),User type (USER_TYPE),Identifier (IDENTIFIER),Birth year (BIRTH_YEAR),Gender (GENDER),Enrolled in (ENROLLED_IN),Assigned to (ASSIGNED_TO)
jkrowling,,Too bad to be here,STUDENT,Potter1,1899,FEMALE,Literature 0,
ignored_data,,You are not a coach,LEARNER,,,,,Ignored class
new_coach,,Miguel de Cervantes,COACH,Sancho1,1969,MALE,,Literature 1
student1,,William Shakespeare,LEARNER,Otelo1,2001,MALE,Literature 1,
student2,,Agatha Christie,LEARNER,Poirot1,1999,FEMALE,"Literature 1,Chemistry2",
