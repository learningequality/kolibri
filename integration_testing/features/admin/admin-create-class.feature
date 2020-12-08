Feature: Admin creates classes
  Admin needs to be able create classes for each facility

  Background:
    Given The user is signed in to Kolibri as facility admin user
      And The user is on *Facility > Classes* page

  Scenario: Create class
    When The user clicks on *New class* button
    Then The user sees *Create new class* modal
    When The user enters class name <class>
      And The user clicks *Save* button
    Then The modal closes
      And The user sees the new <class> class on the *Classes* page

Examples:
| class    |
| Primera  |
| Segunda  |
