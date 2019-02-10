Feature: Coach copies quiz
   Coaches need to be able to copy quizzes to the same or a different class, and assign it to different groups or an entire class

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach > Plan > Quizzes* page
      And I see the quiz <quiz>

  Scenario: Copy quiz to the same class and assign to the entire class
    When I click the quiz <quiz>
    Then I see the <quiz> page
    When I click *Options* button
      And I select *Copy quiz* option
    Then I see the *Copy quiz to* modal
      And I see *'<class>' (current class)* is selected
    When I click *Continue* button
    Then the modal content changes and asks to select recipients
      And I see *Entire class* selected
    When I click *Copy* button
    Then the modal closes
      And the snackbar confirmation appears
    When I click on *quiz*
    Then I see the *Copy of '<quiz>'* in the list of quiz on *Coach > Quizzes* page
      And I see *Entire class* value for it under the *Visible to* column header

  Scenario: Copy quiz to a different class and assign it to just one group
    Given there is a class <class2> that has a group <group>
    When I click the quiz <quiz>
    Then I see the <quiz> page
    When I click *Options* button
      And I select *Copy quiz* option
    Then I see the *Copy quiz to* modal
      And I see *'<class>' (current class)* is selected
    When I select class <class2>
      And I click *Continue* button
    Then the modal content changes and asks to select recipients
      And I see *Entire class* selected
    When I select group <group>
      And I click *Copy* button
    Then the modal closes
      And the snackbar confirmation appears
    When open the sidebar
      And I click on *Coach*
      And I click class <class2>
      And I click on *Quizzes* tab
    Then I see the *Copy of '<quiz>'* in the list of quizzes on *Coach > Quizzes* page
      And I see *1 group* value for it under the *Visible to* column header

Examples:
| quiz          | class    | class2   | group     |
| First Quarter | Buffoons | Maestros | Virtuosas |
