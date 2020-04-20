Feature: Admin bulk export of users and classrooms
  Admin needs to be able to export users and their classrooms

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am on *Facility > Data* page
      And there are learners enrolled in classrooms and coaches assigned to them

  Scenario: Export a CSV file containing all users in the facility
    When I click on "Export" button under *Import and export users* heading
    Then I see the loading indicator
      And after some seconds I see the *Open/Save as* window, or the file 'users_<date>_<time>.csv' is automatically saved on my local drive, depending on the browser defaults
    Then I open the csv file
      And users belong only to my facility, even if there are more facilities in the device
