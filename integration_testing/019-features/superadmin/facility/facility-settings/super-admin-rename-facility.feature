Feature: Rename facility
  A facility admin or super admin can change the name of the facility, which propagates to other servers that have the same facility

  Background:
    Given I am signed in as a facility admin

  Scenario: Rename facility
    Given I am in *Facility > Settings*
      When I click *Edit* next to the <facility> name
      Then I see the *Rename facility* modal
        And I see a warning that renaming does not create a new facility
      When I enter a new name
        And I click *Save*
      Then I see a snackbar that says *Changes saved*
        And I see the new name of the <facility>

  Scenario: See new name appear after syncing with another device
    Given I changed the name of my <facility>
      And I start a sync with another device
      And that device shares my <facility>
      And that device has the old name of the <facility>
    When the sync finishes
    Then the I see the new <facility> name on the other device
