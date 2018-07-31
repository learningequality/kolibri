Feature: coach delete exam

  Coach can Delete the Examination

  Background:
  Given I am signed in to kolibri as Coach user
  And  I am on *Coach > Exams* page

Scenario: Coach delete the exam
When I click the exam name <exam_name>
Then I am on the *Exam name* <exam_name> page
When I click *Options* button
When I select the *Delete*
Then the *Delete exam* modal appears
When I click *Delete* button
Then the exam was deleted

Examples:
| exam_name                           |
| Frist Quarter English Examination   |
