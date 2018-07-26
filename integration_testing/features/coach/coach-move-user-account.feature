Feature: Move user accounts in and out of groups
    Coach can move user accounts in groups

  Background:
    Given I am signed in to kolibri as a coach user
    Given I am on the *Coach > Groups* page
    Given there are learners in the selected class
    Given there are groups created

  Scenario: Move learners into a group
    When I select a learner
    Then *Move Learners* button is enabled
    When I click on *Move learners*
    Then I see the move learners modal
    Then groups that a learner is not assigned to appear
    When I select a group
    When I click on *Move* button
    When modal disappears
    Then I see learners are moved to groups page

