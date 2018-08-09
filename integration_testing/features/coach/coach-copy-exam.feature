Feature: Coach copy exam
   Coaches need to access the copy exam to duplicate if I want a copy to another classes

  Background:
    Given I am signed in to kolibri as coach user
      And I am on *Coach > Exams* page
      And I see the exam <exam_title>

 Scenario: Coach copy lesson
    When I click the exam title <exam_title>
    Then I see the <exam_title> page
    When I click *Options* button
      And I select *Copy to*
    Then I see the *Copy exam* modal
      And I see <class> *Current class* was selected
    When I select the other class <class>
      And I click *Continue* button
    Then the modal change to *assign exam to*
      And I see *Entire class* selected
    When I click *Copy* button
    Then the modal closes
		  And the snackbar notification appears

Examples:
| exam_title     | class    |
| First Quarter  | Buffoons |
