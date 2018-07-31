Feature: Coach delete group

  Coach can delete the group if not nedded anymore

  Background:
  Given I signed in to kolibri as coach user
  Given I am on *Coach > Group* page
  And I see the group have a list of learners

  Scenario: Coach delete the group
  When I click the *Option* button
  When I select *Delete group*
  Then the *delete group* modal appears
  When I click the *Delete group* buttom
  Then the modal disappears
  Then the group was deleted
  Then the learners back to ungroup
