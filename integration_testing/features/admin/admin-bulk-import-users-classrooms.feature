Feature: Admin bulk export of users and classrooms
  Admin needs to be able to import users and their classrooms

  Background:
    Given The user is signed in to Kolibri as a facility admin user
      And The user is on *Facility > Data* page

  Scenario: See the CSV file format requirements
    When The user clicks the *Import* button under *Import and export users* heading
    Then The user sees a new window with a text explaining the consequences of importing
    When The user clicks on the *View spreadsheet format reference* link
    Then The user sees a new modal window with the CSV file fields formats, requirements and validation rules

  Scenario: Bulk import of users from a CSV file
    When The user clicks the *Import* button under *Import and export users* heading
    Then The user sees a new window with a text explaining the consequences of importing
      And The user sees the *Cancel* enabled button
      And The user sees the *Next* disabled button
    When The user clicks the *Browse* button
      And The user selects a CSV file with the right format
    Then The user sees the *Next* button is now enabled
    When The user clicks the *Next* button
    Then The user sees the *Import users* window
      And The user sees the loading indicator
    When The file is processed
    Then The user sees a list of the users and classes that are going to be updated and created
      And The user sees the list of errors, if any
      And The user sees the *Back* and *Import* buttons
    When The user clicks the *Import* button
    Then The user sees the *Success* message
      And The user sees a report with the changes made in the database
    When The user clicks the top left X button to close the modal
      And The user clicks on the *Classes* top menu
    Then The user sees that classes, enrolled learners and assigned coaches now match what was in the CSV

# Example CSV file (for the first row, texts not inside parenthesis may be translated) :
Username (USERNAME),Password (PASSWORD),Full name (FULL_NAME),User type (USER_TYPE),Identifier (IDENTIFIER),Birth year (BIRTH_YEAR),Gender (GENDER),Enrolled in (ENROLLED_IN),Assigned to (ASSIGNED_TO)
jkrowling,,Too bad to be here,STUDENT,Potter1,1899,FEMALE,Literature 0,
ignored_data,,You are not a coach,LEARNER,,,,,Ignored class
new_coach,,Miguel de Cervantes,COACH,Sancho1,1969,MALE,,Literature 1
student1,,William Shakespeare,LEARNER,Otelo1,2001,MALE,Literature 1,
student2,,Agatha Christie,LEARNER,Poirot1,1999,FEMALE,"Literature 1,Chemistry2",
