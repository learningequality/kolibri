Feature: Coach ssign lessons
    Coach need to be able to assign lessons to entire class or various groups

  Background:
    Given I am signed in to Kolibri as a coach user
    Given there are already existing groups
    Given I am on the *Coach > Lessons* page
    Given there is existing lessons

  Scenario: coach can assign the lesson to entire class
    When I click the lesson title <lesson_title>
    Then I am on *Lessons* page
    And I see a class name <class>
    And list of name resources below
    When I click *Option* button
    When I select *Edit details*
    Then the *Edit lesson details* modal was appears
    When I select entire class
    When I click *Save* button
    Then the modal disappears
    And recipients status was change to entire class

    Scenario: coach can assign the lesson to various groups
    When I click the lesson title <lesson_title>
    Then I am on *Lessons* page
    And I see a class name <class>
    And list of name resources below
    When I click *Option* button
    When I select *Edit details*
    Then the *Edit lesson details* modal was appears
    When I select a group from recipients <recipients>
    When I click *Save* button
    Then the modal disappears
    And recipients status was change to group name <recipients>


Examples:
| class     | lesson_title     | recipients |
| Buffoons  | Mathematics      | Group A    |
