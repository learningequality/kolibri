Feature: Coach copies lesson
  Coaches need to be able to copy lessons to the same or a different class, and assign it to different groups or an entire class

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach - '<class>' > Plan > Lessons* page
      And I see the <lesson> lesson

  Scenario: Copy lesson to the same class and assign to the entire class
    When I click the <lesson> lesson
    Then I see the <lesson> page
    When I click *Options* button
      And I select *Copy lesson* option
    Then I see the *Copy lesson to* modal
      And I see *'<class>' (current class)* is selected
    When I click *Continue* button
    Then the modal content changes and asks to select recipients
      And I see *Entire class* selected
    When I click *Copy* button
    Then the modal closes
			And the snackbar confirmation appears
    When I click on *All Lessons*
    Then I see the *Copy of '<lesson>'* in the list of lessons
      And I see *Entire class* value for it under the *Recipients* heading

  Scenario: Copy lesson to a different class and assign it to just one group
    Given there is a class <class2> that has a group <group>
      When I click the <lesson> lesson
      Then I see the <lesson> page
      When I click *Options* button
        And I select *Copy lesson* option
      Then I see the *Copy lesson to* modal
        And I see *'<class>' (current class)* is selected
      When I select class <class2>
        And I click *Continue* button
      Then the modal content changes and asks to select recipients
        And I see *Entire class* selected
      When I select group <group>
        And I click *Copy* button
      Then the modal closes
        And the snackbar confirmation appears
      When I open the sidebar
        And I click on *Coach*
        And I click class <class2>
        And I click on *Plan > Lessons* tab
      Then I see the *Copy of '<lesson>'* in the list of lessons
        And I see *1 group* value for it under the *Recipients* heading

Examples:
| lesson       | class    | class2    | group     |
| Mathematics  | Buffoons | Maestros  | Virtuosas |
