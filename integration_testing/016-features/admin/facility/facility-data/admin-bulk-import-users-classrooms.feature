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
