Feature: Coach create exams
    Coach need to be able to create exams from existing content

  Background:
    Given I am signed in to Kolibri as a coach user
    Given Khan academy (fr) Mathématiques was exist in content
    Given I am on the *Coach > Exams* page

Scenario: Coach can create an examination
  When I click *New exams* button
  Then I am on the *create a new exams* page
  When I fill in the exam title <exam_title>
  When I fill in the number of question <number_of_question>
  When I select exercises to pull question <exercises_questions>
  When I click *Preview* buttom
  Then the *Preview exam* modal is appears
  And I see lot of questions
  When I click *Randomize questions* buttom
  Then the arrangement of questions will change
  When I click *Close* button
  Then the modal will disappears
  And I am back to my creating examination
  When I click *Finish* button
  Then the new exams will created
  And I see my exam title <exam_title>

Examples:
| exam_title                       | number_of_question | exercises_questions |
| First Quarter, Math examination  | 50                 | Mathématiques       |

