Feature: Coach assigns quizzes
  Coach needs to be able to assign quizzes to one or more groups, as the quiz by default is assigned to the entire class

  Background:
    Given there are 2 or more learner groups
      And I am signed in to Kolibri as a coach user
      And I am on the *Coach > Plan > Quizzes* page
      And I see the quiz <quiz_title>

    Scenario: Assign quiz to group(s)
      When I click the quiz <quiz_title>
      Then I see the <quiz_title> quiz page
        And I see the full list of learners enrolled in the class
      When I click *Options* button
        And I select *Edit details*
      Then I see the *Edit quiz details* modal
      When I select one or more groups
        And I click *Save* button
      Then the modal closes
        And I see the snackbar notification
        And I see the chosen group(s) under *Visible to*

Examples:
| quiz_title     |
| First quarter  |
