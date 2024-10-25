Feature: Admin bulk export of users and classrooms
  Admin needs to be able to export users and their classrooms

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am on *Facility > Data* page
      And there are learners enrolled in classrooms and coaches assigned to them

  Scenario: Export a CSV file containing all users in the facility
    When I click on *Generate user CSV file* link under the *Import and export users* heading
    Then I see the loading indicator
    	And I see that the *Download CSV* button becomes enabled
    	When I click on the *Download CSV* button
      And I can open or save the file '<facility>_users.csv'
    When I open the CSV file
    Then I see that it contains only users from my facility, even if there are more facilities in the device
