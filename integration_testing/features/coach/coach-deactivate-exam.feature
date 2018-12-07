Feature: Coach deactivate exams
  Coaches need to make exams inactive when the submission period is over

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach > Exams* page
      And I see the exam <exam_title>

  Scenario: Change the exam status to *Inactive*
    When I click the exam <exam_title>
    Then I see the <exam_title> exam page
      And I see the exam *Status* is *Active*
    When I click *Change*
    Then I see the *Change exam status* modal
    When I select *Inactive*
      And I click *Save* button
    Then the modal closes
      And I see the exam *Status* is *Inactive*

Examples:
| exam_title     |
| First quarter  |
