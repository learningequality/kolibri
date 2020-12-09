Feature: Admin creates classes
  Admin needs to be able create classes for each facility

  Background:
    Given I am signed in to Kolibri as facility admin user
      And I am on *Facility > Classes* page

  Scenario: Create class
    When I click on *New class* button
    Then I see *Create new class* modal
    When I enter class name <class>
      And I click *Save* button
    Then the modal closes
      And I see the new <class> class on the *Classes* page

Examples:
| class    |
| Primera  |
| Segunda  |
