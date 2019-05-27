Feature: Groups subtab
  Coach needs to be able to review reports scoped to groups of learner

  Background:
    Given I am logged in as a coach
      And I am on *Coach - '<class>' > Reports* tab
      And there is a <lesson> with a <resource> and <exercise> assigned to <class>

  Scenario: Navigate into the *Groups* subtab
    Given I am on any tab inside *Coach - '<class>' > Reports*
      When I click the *Groups* subtab
      Then I see a table rows with groups and data columns pertaining to each group

  Scenario: Review reports for a specific group
    Given I am on the *Coach - '<class>' > Reports > Groups* subtab
      When I click <group> group
      Then I see the <group> profile page
        And I see the list of lessons and quizzes assigned to <group> in the *Reports* subtab

  Scenario: Review progress of a quiz assigned to a group
    Given I am on the <group> profile page
      And there are quizzes assigned to it
        When I click on the <quiz> quiz assigned to <group>
        Then I see the quiz <quiz> report page for <group>
          And I see all quiz data scoped to <group>

  Scenario: Review learner’s quiz report
    Given I am on the <quiz> report for <group> 
      When I click on <learner> learner name
      Then I see the <learner> learner individual attempt report for the <quiz>
    
  Scenario: Review progress of a lesson assigned to a group
    Given I am on the <group> profile page
      And there are lessons assigned to it
        When I click on the <lesson> assigned to <group>
        Then I see the <lesson> report page for <group>
          And I see the columns for <group> *Progress* and *Average time spent* for each <lesson> resource

  Scenario: Review progress of group members
    Given I am on the <group> profile page
      When I click on *Members* subtab
      Then I see a list of all the members of that group
        And I see the columns displaying quiz averages, resource completions, and last activity for each member

  Scenario: Review the group's activity
    Given I am on the <group> profile page
      When I click on the *Activity* subtab
      Then I see an activity feed of resources members engaged with
        And I see the *Resource type* and *Progress type* filter options

Examples:
| class     | group  | quiz    | lesson    |
| Mi classe | GrupoA | Sumar 1 | Dividir 2 |
