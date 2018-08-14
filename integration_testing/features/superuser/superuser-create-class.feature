Feature: Superuser create classes
    Superuser needs to be able create classes for each facility

  Background:
    Given I am signed in to Kolibri as superuser
      And I am on *Facility > Classes* page

  Scenario: Create class
    When I click on *New class* button
    Then I see *Add new class* modal
    When I enter class name <class>
      And I click *Create* button
    Then the modal closes
      And I see the new class on the *Classes* page

Examples:
| class    |
| Primera  |
| Segunda  |