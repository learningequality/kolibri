Feature: Admin creates classes
  Admin needs to be able create classes for each facility

  Background:
    Given I am signed in to Kolibri as facility admin user
      And I am on *Facility > Classes* page

  Scenario: Create class
    When I click on the *New class* button
    Then I see the *Create new class* modal
    When I enter a class name
      And I click the *Save* button
    Then the modal closes
      And I see the new class in the *Classes* table
