Feature: Admin deactivates users
  Admin needs to be able to deactivate users from the facility

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am at *Facility > Users* page
      And there are users of all supported types

  Scenario: Deactivate a user
    When I click on the *⋮* button for the user I want to deactivate
      And I select the *Delete* option
    Then I see the *Remove 1 user* modal
    When I click the *Yes, remove* button
    Then the modal closes
      And I see the *Facility > Users* page again
      And I see the *Selected users have been removed UNDO* snackbar message
    When I search for the deactivated user in the search field
    Then I see the *No users exist* text

  Scenario: Deactivate several users
    When I select several users from the table
    And I click the *Remove selected users* icon
    Then I see the *Remove N users* modal
    When I click the *Yes, remove* button
    Then the modal closes
      And I see the *Facility > Users* page again
      And I see the *Selected users have been removed UNDO* snackbar message
    When I search for the deactivated users in the search field
    Then I see the *No users exist* text

  Scenario: Try (and fail) to deactivate your own account
    When I click on *⋮* button for my own account
    Then I see that the *Delete* option is not active
