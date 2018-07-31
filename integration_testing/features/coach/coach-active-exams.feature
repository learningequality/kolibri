Feature: Coach active the exams

   Can active the existing examinations
   To indicate the status of exams

  Background:
  Given I am signed in to kolibri as coach user
  Given I am on *Coach > Exams* page
  And have a list of exams title <exam_title>

  Scenario: coach switch the examination status to active
  Given I click the exam title <exam_title>
  Then I am on *Exam title* page <exam_title>
  And I see all learners that enrolled on my class <class>
  And I see the status made inactive <status>
  When I click *Change* label
  Then the *Change exam status* modal was appears
  When I select active
  When I click *Save* button
  Then I see the exam is now active
  And the status was change to active


Examples:
| exam_title                          | class     | status   |
| first quarter, english examination  | st. Anne  | active   |


