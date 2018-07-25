Feature: Move user accounts in and out of groups
    Coach should be able to sign in to access Kolibri Coach tab
    Coach can move user accounts in groups

  Background:
    Given you are in coach groups page
    Given there are learners in the selected class
    Given that there are groups created

  Scenario: Move learners into a group
    When I select a learner
    Then MOVE Learners button is enabled
    When I click on move learners
    Then I see the move learners modal
    Then groups that a learner is not assigned to appear
    When I select a group
    When i click on “move” button
    Then learners are moved to groups
    When modal disappears
    Then I see learners on groups page

