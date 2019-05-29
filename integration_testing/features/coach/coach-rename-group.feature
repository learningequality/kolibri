Feature: Coach needs to be able to rename groups

  Background:
    Given that there are groups created
      And I am signed in to Kolibri as coach user
      And I am in the *Coach - '<class>' > Plan > Groups* page

  Scenario: Edit the group name
    When I click *Options* button
      And I select *Rename* option
    Then *Rename group* modal appears
    When I change group name
      And I click *Save*
    Then the modal closes
     And I see the changed group name

  Scenario: Check validation for the name field
    When I try to enter a name with more than 50 characters
    Then I see that the name is cut at 50
    When I input a group name same as for an already existing group
    Then I see the error notification *A group with that name already exists* 
    When I leave the name field empty
      And I click *Save*
    Then I see the error notification *This field is required*
