Feature: Coach delete group
  Coach needs to delete a group that is not needed anymore

  Background:
    Given there are learners in the selected class
      And there is at least one groups created and learners assigned to it
      And I am signed in to Kolibri as a coach user
      And I am on the *Coach > Groups* page

  Scenario: Coach deletes the group
    When I click the *Option* button
      And I select *Delete*
    Then the *Delete group* modal appears
    When I click the *Delete* button
    Then the modal closes
      And I don't see the deleted group
      And I see the learners are moved to *Ungrouped*