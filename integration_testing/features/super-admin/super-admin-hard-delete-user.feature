Feature: Super Admin delete user
    Super Admin need to be able to delete a user from the command line

  Background:
    Given that there exists a user with username <username> I want to delete
      And I have access to terminal for Kolibri

  Scenario: Delete user with username <username>
    When I type `kolibri manage deleteuser <username>` into the terminal
      And I hit *Enter*
    Then I see "Are you sure you wish to permanently delete this user? This will DELETE ALL DATA FOR THIS USER." message
    When I type "yes"
      And I hit *Enter*
    Then I see "ARE YOU SURE? If you do this, there is no way to recover the user data on this device." message
    When I type "yes"
      And I hit *Enter*
    Then all user data associated with username <username> should be deleted
