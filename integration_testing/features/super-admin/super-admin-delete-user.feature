Feature: Super admin deletes users
    Super admin needs to be able to delete users from the facility

  Background:
    Given I am signed in to Kolibri super admin
      And I am on *Facility > Users* page

  Scenario: Delete user
    When I click on *Options* button for the user I want to edit
      And I select *Delete* option
    Then I see *Delete user * modal
    When I click the *Delete* button
    Then the modal closes
      And I see the *Facility > Users* page again 
      And I see the snackbar confirmation that the user has been deleted
    When I search for the deleted user in the search field
    Then I see the *No users match the filter* result

  Scenario: Try (and fail) to delete your own account
    When I click on *Options* button for my own account
    Then I see that the *Delete* option is not active
    