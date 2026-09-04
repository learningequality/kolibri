Feature: Admin assigns users to class(es)
  Admin users need to be able to assign users to classes

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am at *Facility > Users* page
      And there are several created users of type coach, facility coach, and admin
      And there are several classes

  Scenario: Assign users to a class
    When I select one or several users of type coach, facility coach or admin from the *Users* table
    Then I see that the *Assign coach* icon has become enabled
    When I click the *Assign coach* icon
    Then I see the *Assign coach* side panel
      And I see a search field and a table with the available classes
      And the *Assign* button is disabled
    When I select a class
      And I click the *Assign* button
    Then the page reloads
      And I see the *Coaches assigned UNDO* snackbar message
    When I go to *Facility > Classes*
    Then I can verify that the users have been assigned in the specified class

  Scenario: Assign users to several classes
    Given I've selected several users of type coach, facility coach or admin from the *Users* table
    	And I am at the *Assign coach* side panel
    When I select several or all of the available classes
      And I click the *Assign* button
    Then the page reloads
      And I see the *Coaches assigned UNDO* snackbar message
    When I go to *Facility > Classes*
    Then I can see that the users have been assigned to the specified classes

  Scenario: Undo the assignment of users
    Given I've selected several users of type coach, facility coach or admin from the *Users* table
    	And I am at the *Assign coach* side panel
    When I select several or all of the available classes
      And I click the *Assign* button
    Then the page reloads
      And I see the *Coaches assigned UNDO* snackbar message
    When I click the *Undo* button
    Then I see an *Action successful* snackbar message
    When I go to *Facility > Classes*
    Then I can see that the users have not been assigned in the specified classes
