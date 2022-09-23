Feature: New landing page for super admins in Coach plugin
  A super admin should be able to select the facility they would like to view when there is more than one facility on the device

# If there is only one facility on the device, there should essentially be no change to the 0.13 *Coach* landing page experience

  Background:
    Given I am signed in as a super admin

  Scenario: View Facilities landing page in Coach plugin
    Given there is more than one facility on the device
    When I open the side panel menu
      And I click *Coach*
    Then I see a *Facilities* page
      And I see a list of <facilities> on the device
      And I see how many <classes> are in each <facility>
      And I don't see the *Coach* plugin subtabs

  Scenario: View class list in facility
    Given there is more than one facility on the device
      And I am on the *Coach > Facilities* page
    When I click on a <facility>
    Then I see the *Facility > Classes* page
      And I see *Coach - <facility>* in the action bar
      And I see a link above *Classes* for *All facilities*
      But I don't see the *Coach* plugin subtabs

  Scenario: View class in a facility
    Given there is more than one facility on the device
      And I am on the *Coach > Facilities > Classes* page
    When I click on a <class>
    Then I see the *Class home* page
      And I see *Coach - <facility> - <class>* in the action bar
      And I see the *Coach* plugin subtabs

  Scenario: Go back to facilities list
    Given there is more than one facility on the device
      And I am viewing *Coach > Classes* for some <facility>
      And I see *Coach - <facility>* in the action bar
    When I click *All facilities*
    Then I see a *Facilities* page
      And I see a list of <facilities> on the device

  Scenario: Landing page for only one facility on the device
    Given there is only one facility on the device
      And there are multiple classes in that facility
    When I open the side panel menu
      And I click *Coach*
    Then I see the *Coach > Classes* page
      And I see *Coach* in the action bar

  Scenario: Landing page for only one facility and one class on the device
    Given there is only one facility on the device
      And there is one class in that facility
    When I open the side panel menu
      And I click *Coach*
    Then I see the *Class Home* page
      And I see *Coach* in the action bar

Examples:
| facility | class   |
| MySchool | MyClass |
