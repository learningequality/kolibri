Feature: Admin removes users from class(es)
  Admin users need to be able to remove users from classes

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am at *Facility > Users* page
      And there are several created users of different types
      And there are several classes with already enrolled or assigned users

  Scenario: Remove users from a class
    When I select one or several users from the *Users* table
    Then I see that the *Remove from class* icon has become enabled
    When I click the *Remove from class* icon
    Then I see the *Remove N users from classes* side panel
      And I see a search field and a table with the available classes
      And the *Remove* button is disabled
    When I select a class
      And I click the *Remove* button
    Then the page reloads
      And I see the *Selected users removed UNDO* snackbar message
    When I go to *Facility > Classes*
    Then I can verify that the users have been removed from the specified class

  Scenario: Remove users from several classes
    Given I've selected several users and I am at the *Remove N users from classes* side panel
    When I select several or all of the available classes
      And I click the *Remove* button
    Then the page reloads
      And I see the *Selected users removed UNDO* snackbar message
    When I go to *Facility > Classes*
    Then I can see that the users have been removed from the specified classes

  Scenario: Undo the removal of users
    Given I've selected several users and I am at the *Remove N users from classes* side panel
    When I select several or all of the available classes
      And I click the *Remove* button
    Then the page reloads
      And I see the *Selected users removed UNDO* snackbar message
    When I click the *Undo* button
    Then I see an *Action successful* snackbar message
    When I go to *Facility > Classes*
    Then I can see that the users have not been removed from the specified classes
