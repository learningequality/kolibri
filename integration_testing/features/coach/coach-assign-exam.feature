Feature: Coach assign exams
  Coach needs to be able to assign exams to one or more groups, as the exam by default is assigned to the entire class

  Background:
    Given there are 2 or more learner groups
      And I am signed in to Kolibri as a coach user
      And I am on the *Coach > Exams* page
      And I see the exam <exam_title>

    Scenario: Assign exam to group(s)
      When I click the exam <exam_title>
      Then I see the <exam_title> exam page
        And I see the full list of learners enrolled in the class
      When I click *Options* button
        And I select *Edit details*
      Then I see the *Edit exam details* modal
      When I select one or more groups
        And I click *Save* button
      Then the modal closes
        And I see the chosen group(s) under *Visible to*

Examples:
| exam_title     |
| First quarter  |
