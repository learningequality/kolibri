Feature: Coach copy lesson
   Coaches need to access the copy lessons to duplicate if I want a copy to another classes

  Background:
    Given I am signed in to kolibri as coach user
      And I am on *Coach > lessons* page
      And I see the lesson <lesson>

 Scenario: Coach copy lesson
    When I click the lesson title <lesson_title>
    Then I see the <lesson_title> page
    When I click *Options* button
      And I select *Copy lesson*
    Then I see the *Copy lesson* modal
      And I see <class> *Current class* was selected
    When I select the other class <class>
      And I click *Continue* button
    Then the modal change to *assign lesson*
      And I see *Entire class* selected
    When I click *Copy* button
    Then the modal closes
			And the snackbar notification appears

Examples:
| lesson_title | class    |
| Mathematics  | Buffoons |
