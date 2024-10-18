Feature: Coach copies lesson
  Coaches need to be able to copy lessons to the same or a different class, and assign it to different groups or an entire class

  Background:
    Given I am signed in to Kolibri as coach user
      And I am at *Coach - '<class>' > Lessons* page
      And I have already created some lessons

  Scenario: Copy lesson to the same class and assign it to the entire class
    When I click the title of a lesson
    Then I see the lesson summary page
    When I click *...* button next to *Manage resources*
      And I select the *Copy lesson* option
    Then I see the *Copy lesson to* modal
      And I see that *'<class>' (current class)* is selected
    When I click the *Continue* button
    Then the modal content changes and asks to select recipients
      And I see that *Entire class* is selected by default
    When I click the *Copy* button
    Then the modal closes
			And the snackbar confirmation appears
    When I click on *All Lessons*
    Then I see the *Copy of '<lesson>'* in the list of lessons
      And I see *Entire class* value for it under the *Recipients* heading

  Scenario: Copy lesson to a different class and assign it to just one group
    Given there is a class for which there is a group of learners
    When I click the title of a lesson
    Then I see the lesson summary page
    When I click *...* button next to *Manage resources*
      And I select the *Copy lesson* option
    Then I see the *Copy lesson to* modal
      And I see that *'<class>' (current class)* is selected
    When I select a class
      And I click the *Continue* button
    Then the modal content changes and asks to select recipients
      And I see that *Entire class* is selected by default
    When I select a group
      And I click the *Copy* button
    Then the modal closes
      And the snackbar confirmation appears
    When I open the sidebar
      And I click on *Coach*
      And I select the other class
      And I go to the *Coach > Lessons* page
    Then I see the *Copy of '<lesson>'* in the list of lessons
      And I see the specified group under the *Recipients* heading
