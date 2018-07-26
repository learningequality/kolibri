Feature: Coach needs to be able to rename groups

  Background:
    Given That I am signed in to Kolibri as coach user
    Given that there are groups created
    Given I am in the *Coach > Groups* page

  Scenario: Edit the group name
    When I click on *Options*
    Then *Rename group* and *Delete group* options appear
    When I click on *Rename group* button
    Then *Rename group* modal appears
    When I change group name
    And I click on *Save*
    Then modal disappears
    Then I can see the changed group name