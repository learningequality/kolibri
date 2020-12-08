Feature: Admin can delete classes
  Admin needs to be able to delete classes from the facility

  Background:
    Given The user is signed in to Kolibri as a facility admin user
      And The user is on *Facility > Classes* page
      And There is a class <class> created in the facility

  Scenario: Delete class
    When The user clicks on *Delete class* button for the class <class>
    Then The user sees *Delete class* modal
    When The user clicks *Delete* button
    Then The modal closes
    # no confirmation that the class has been deleted
      And The user doesn't see the deleted class on the *Classes* page anymore

Examples:
| class    |
| Primera  |
| Segunda  |
