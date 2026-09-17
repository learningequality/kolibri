Feature: Landing page for super admins in Coach plugin
  A super admin should be able to select the facility they would like to view when there is more than one facility on the device

	Background:
    Given I am signed in as a super admin

  Scenario: Landing page for only one facility on the device
    Given there is only one facility on the device
      And there are multiple classes in that facility
    When I open the side panel menu
      And I click *Coach*
    Then I see the *Coach > Classes* page
    	And I see the *Classes* table
      And I see the following columns: *Class name*, *Coaches*, *Learners*

  Scenario: Landing page for only one facility and one class on the device
    Given there is only one facility on the device
      And there is one class in that facility
    When I open the side panel menu
      And I click *Coach*
    Then I see the *Class home* page

  Scenario: View Facilities landing page in Coach plugin
    Given there is more than one facility on the device
    When I open the side panel menu
      And I click *Coach*
    Then I see the *Facilities* page
      And I see a list with the available facilities on the device
      And I see the number of classes for each facility

  Scenario: View class list in facility
    Given there is more than one facility on the device
      And I am on the *Coach > Facilities* page
    When I click on a <facility>
    Then I see the *Facility > Classes* page
      And I see *Coach - <facility>* in the action bar
      And I see an *All facilities* link above the *Classes* table

  Scenario: View class in a facility
    Given there is more than one facility on the device
      And I am on the *Coach > Facilities > Classes* page
    When I click on a <class>
    Then I see the *Class home* page
      And I see *Coach - <facility> - <class>* in the action bar
      And I see the following tabs: *Class home*, *Reports* and *Plan*

  Scenario: Go back to facilities list
    Given there is more than one facility on the device
      And I at the *Coach > Classes* page for a <facility>
      And I see *Coach - <facility>* in the action bar
    When I click *All facilities*
    Then I see the *Coach > Facilities* page
      And I see a list of facilities on the device
