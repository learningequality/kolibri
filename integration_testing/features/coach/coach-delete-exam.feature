Feature: Coach delete exam
  Coach needs to be able to delete the exam when necessary

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach > Exams* page

  Scenario: Delete exam
    When I click the exam <exam_name>
    Then I see the <exam_name> page
    When I click *Options* button
      And I select *Delete*
    Then I see the *Delete exam* modal
    When I click *Delete* button
    Then the modal closes
      And the snackbar notification appears
      And I don't see the <exam_name> on the list of *Exams*

Examples:
| exam_name                           |
| Frist Quarter English Examination   |
