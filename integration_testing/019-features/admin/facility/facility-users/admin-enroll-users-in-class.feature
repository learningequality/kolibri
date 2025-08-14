Feature: Admin enrolls users in class(es)
  Admin users need to be able to enroll users in classes

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am at *Facility > Users* page
      And there are several created users
      And there are several classes

  Scenario: Enroll users in a class
    When I select one or several users from the *Users* table
    Then I see that the *Enroll to class* icon has become enabled
    When I click the *Enroll to class* icon
    Then I see the *Enroll to class* side panel
      And I see info messages for the number of selected users, how many users are not enrolled in any class etc
      And I see a general info message that users already in selected classes will not be affected
      And I see search field and a table with the available classes
      And the *Enroll* button is disabled
    When I select a class
      And I click the *Enroll* button
    Then the page reloads
      And I see the *Selected users have been enrolled* snackbar message
      And I see a *N users have been enrolled* modal
    When I dismiss the modal
    	And I go to *Facility > Classes*
    Then I can see that the users have been enrolled in the specified class

  Scenario: Enroll users in several classes
    Given I've selected several users and I am at the *Enroll to class* side panel
    When I select several or all of the available classes
      And I click the *Enroll* button
    Then the page reloads
      And I see the *Selected users have been enrolled* snackbar message
      And I see a *N users have been enrolled* modal
    When I dismiss the modal
    	And I go to *Facility > Classes*
    Then I can see that the users have been enrolled in the specified classes

  Scenario: Undo the enrollment of users
    Given I've selected several users and I am at the *Enroll to class* side panel
    When I select several or all of the available classes
      And I click the *Enroll* button
    Then the page reloads
      And I see the *Selected users have been enrolled* snackbar message
      And I see a *N users have been enrolled* modal
    When I click the *Undo* button
    	And I go to *Facility > Classes*
    Then I can see that the users have not been enrolled in the specified classes
