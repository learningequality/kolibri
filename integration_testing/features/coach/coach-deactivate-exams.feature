Feature: Coach deactivate exams
    Coaches need to make exams inactive when the submission period is over

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach > Exams* page
      And I see the exam <exam_title>

  Scenario: Coach changes the exam status to *Inactive*
