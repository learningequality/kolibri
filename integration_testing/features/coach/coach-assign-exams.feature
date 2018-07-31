Feature: Coach assign exams
    Coach need to be able to assign exams to entire class or various groups

  Background:
    Given I am signed in to Kolibri as a coach user
    Given I am on the *Coach > Exams* page
    And have a list of exams title <exam_title>
    Given one or more then groups was made

    Scenario: coach can assign the examination to entire class
    When I click the exam title <exam_title>
    Then I am on *Exam title* page <exam_title>
    And I see all learners that enrolled on my class <class>
    When I click *Option* button
    When I select *Edit details*
    Then the *Edit exam details* modal was appears
    And I see the title and recipients selections
    When I select entire class
    When I click *Save* button
    Then the modal disappears
    And recipients status was change to entire class

    Scenario: coach can assign the examination to various groups
    When I click the exam title <exam_title>
    Then I am on *Exam title* page <exam_title>
    And I see all learners that enrolled on my class <class>
    When I click *Option* button
    When I select *Edit details*
    Then the *Edit exam details* modal was appears
    And I see the title and recipients selections
    When I select a group that I want from recipients <recipients>
     When I click *Save* button
    Then the modal disappears
    And recipients status was change to group <recipients>


Examples:
| exam_title                          | class     | recipients     |
| first quarter, english examination  | st. Anne  | Group A        |


