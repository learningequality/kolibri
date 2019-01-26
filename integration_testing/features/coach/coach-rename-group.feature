Feature: Coach needs to be able to rename groups

  Background:
    Given that there are groups created
      And I am signed in to Kolibri as coach user
      And I am in the *Coach > Plan > Groups* page

  Scenario: Edit the group name
    When I click *Options* button
      And I select *Rename* option
    Then *Rename group* modal appears
    When I change group name
      And I click *Save*
    Then the modal closes
     And I see the changed group name



     #Checks