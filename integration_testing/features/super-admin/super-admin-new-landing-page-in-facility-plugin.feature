Feature: New landing page for super admins in Facility plugin
  A super admin should be able to select the facility they would like to view when there is more than one facility on the device

# If there is only one facility on the device, there should essentially be no change to the 0.13 *Facility* landing page experience

  Background:
    Given I am signed in as a super admin

  Scenario: View Facilities landing page in Facility plugin
    Given there is more than one facility on the device
    When I open the side panel menu
      And I click *Facility*
    Then I see a *Facilities* page
      And I see a list of facilities on the device
      And I see how many classes are in each facility
      And I don't see the *Facility* plugin subtabs

  Scenario: View facility
    Given there is more than one facility on the device
      And I am on the *Facility > Facilities* page
    When I click on a <facility>
    Then I see the *Facility > Classes* subtab
      And I see the *Facility* subtabs appear in the action bar
      And I see *Facility - <facility>* in the action bar
      And I see a link above *Classes* for *All facilities*

  Scenario: Go back to facilities list
    Given there is more than one facility on the device
      And I am viewing *Facility > Classes* for some <facility>
      And I see *Facility - <facility>* in the action bar
    When I click *All facilities*
    Then I see a *Facilities* page
      And I see a list of facilities on the device

  Scenario: Landing page for only one facility on the device
    Given there is only one facility on the device
      And there are multiple classes in that facility
    When I open the side panel menu
      And I click *Facility*
    Then I see the *Facility > Classes* subtab
      And I see *Facility* in the action bar
      And I see the *Facility* subtabs in the action bar

Examples:
| facility |
| MySchool |
