Feature: Admin bulk export of users and classrooms
  Admin needs to be able to import users and their classrooms

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am on *Facility > Data* page

  Scenario: See the CSV file format requirements
    When I click the *Import* button under *Import and export users* heading
    Then I see a new window with a text explaining the consequences of importing
    When I click on the *View spreadsheet format reference* link
    Then I see a new modal window with the CSV file fields formats, requirements and validation rules

  Scenario: Bulk import of users from a CSV file
   When I click the *Import* button under *Import and export users* heading
    Then I see a new window with a text explaining the consequences of importing
      And I see the *Cancel* enabled button
      And I see the *Next* disabled button
    When I click the *Browse* button
      And select a CSV file with the right format
    Then I see the *Next* button is now enabled
    When I click the *Next* button
    Then I see the *Import users* window
      And I see the loading indicator
    When the file is processed
    Then I see a list of the users and classes that are going to be updated and created
      And I see the list of errors, if any
      And I see the *Back* and *Import* buttons
    When I click the *Import* button
    Then I see the *Success* message
      And I see a report with the changes made in the database
    When I click the top left X button to close the modal
      And I click on the *Classes* top menu
    Then I see that classes, enrolled learners and assigned coaches now match what was in the CSV

# Example CSV file (for the first row, texts not inside parenthesis may be translated) :
Username (USERNAME),Password (PASSWORD),Full name (FULL_NAME),User type (USER_TYPE),Identifier (IDENTIFIER),Birth year (BIRTH_YEAR),Gender (GENDER),Enrolled in (ENROLLED_IN),Assigned to (ASSIGNED_TO)
jkrowling,,Too bad to be here,STUDENT,Potter1,1899,FEMALE,Literature 0,
ignored_data,,You are not a coach,LEARNER,,,,,Ignored class
new_coach,,Miguel de Cervantes,COACH,Sancho1,1969,MALE,,Literature 1
student1,,William Shakespeare,LEARNER,Otelo1,2001,MALE,Literature 1,
student2,,Agatha Christie,LEARNER,Poirot1,1999,FEMALE,"Literature 1,Chemistry2",
