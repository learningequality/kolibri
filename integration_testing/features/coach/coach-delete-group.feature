Feature: Coach delete group
  Coach needs to delete a group if not needed anymore

  Background:
    Given there are learners in the selected class
      And there are groups created
    Given I am signed in to Kolibri as a coach user
      And I am on the *Coach > Groups* page

  Scenario: Coach deletes the group
    When I click the *Option* button
      And I select *Delete group*
    Then the *Delete group* modal appears
    When I click the *Delete group* button
    Then the modal closes
      And I don't see the deleted group
      And I see the learners are moved to *Ungrouped*