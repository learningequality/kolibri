Feature: Class coach view
  Class coaches need to be able to review the progress in class(es) they are assigned to, but not other classes in the facility.

  Background:
    Given I am signed in as a class coach
      And there are several classes in the facility
      And I am assigned to some of the classes

  Scenario: Open the *Class home* page
    When I open the sidebar
      And click on *Coach > Class home*
    Then I see the *Classes* page
    	And I see a list of the classes to which I am assigned as a *Coach*
      And I cannot see any other class in the facility
    When I click on the class name of a class
    Then I am on *Class home* page for the class
    	And I can view all of the available information for the learners' progress and activities
    When I click the *All classes* link
    Then I am back at the *Classes* page
    	And I can select a different class
    # Run the rest of the coach scenarios
