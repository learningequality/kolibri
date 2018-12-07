Feature: Coach activate exams
  Coaches need to activate exams in order for learners to gain access and start submitting them

  Background:
    Given I am signed in to kolibri as coach user
      And I am on *Coach > Exams* page
      And I see the exam <exam_title>

  Scenario: Change the exam status to *Active*
    When I click the exam <exam_title>
    Then I see the <exam_title> exam page
      And I see the exam *Status* is *Inactive*
    When I click *Change*
    Then I see the *Change exam status* modal
    When I select *Active*
      And I click *Save* button
    Then the modal closes
      And I see the exam *Status* is *Active*

Examples:
| exam_title     |
| First quarter  |
