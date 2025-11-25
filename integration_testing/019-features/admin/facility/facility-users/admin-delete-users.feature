Feature: Admin can delete users
  Admin needs to be able to delete users from the facility

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am at *Facility > Users* page
      And there are users of all supported types

  Scenario: Delete a user
    When I click on the *⋮* button for the user I want to deactivate
      And I select the *Delete* option
    Then I see the *Delete 1 user* modal
    When I click the *Delete* button
    Then the modal closes
      And I see the *Facility > Users* page again
      And I see the *Users deleted UNDO* snackbar message
    When I search for the deactivated user in the search field
    Then I see the *No users match this search* text

  Scenario: Delete several users
    When I select several users from the table
    And I click the *Delete selected* icon
    Then I see the *Delete N users* modal
    When I click the *Delete* button
    Then the modal closes
      And I see the *Facility > Users* page again
      And I see the *Users deleted UNDO* snackbar message
    When I search for the deactivated users in the search field
    Then I see the *No users match this search* text

  Scenario: Try (and fail) to deactivate your own account
    When I click on *⋮* button for my own account
    Then I see that the *Delete* option is not active
    When I select the checkbox of my own user
    Then I see that the *Delete selected* icon remains disabled
