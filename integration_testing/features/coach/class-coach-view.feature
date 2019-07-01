Feature: Class coach view
  Class coaches need to be able to review the progress in class(es) they are assigned to, but not other classes in the facility.

  Background:
    Given I am signed in as a class coach
      And there is more than one class in the facility

  Scenario: Open *Coach* tab
    When I open the sidebar
      And click on *Coach*
    Then I see a list of classes I am assigned to as a *Coach*
      But I cannot see any other class in the facility
    When I click on the class <class>
    Then I am on *Class home* for class <class>
    # Run the rest of the coach scenarios

Examples:
| class    |
| Buffoons |
| Jugglers |