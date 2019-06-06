Feature: Super admin delete user
    Super admin needs to be able to delete a user from the command line

  Background:
    Given that there is a username <username>
      And I have access to Terminal on device

  Scenario: Delete user and all their data
    When I type `kolibri manage deleteuser <username>` into the terminal
      And I press *Enter* key
    Then I see a confirmation message asking if I am sure I would like to delete the user data
    When I type "yes"
      And I pres *Enter* key
    Then I see a second confirmation message, reiterating that I cannot recover the user data.
    When I type "yes"
      And I press *Enter* key
    Then I get confirmation message that the user data associated with username <username> has been deleted

Examples:
| username |
| coach    |
| learner  |
| admin    |
