Feature: Admin can delete classes
  Admin needs to be able to delete classes from the facility

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am on *Facility > Classes* page
      And there is a class <class> created in the facility

  Scenario: Delete class
    When I click on *Delete class* button for the class <class>
    Then I see *Delete class* modal
    When I click *Delete* button
    Then the modal closes
    # no confirmation that the class has been deleted
      And I don't see the deleted class on the *Classes* page anymore

Examples:
| class    |
| Primera  |
| Segunda  |
