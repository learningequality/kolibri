Feature: Coach create exams
    Coach need to be able to assign exams to entire class or various groups

  Background:
    Given I am signed in to Kolibri as a coach user
    Given I am on the *Coach > Groups* page
    Given there is a channel <channel> and topic <topic> that contains exercises 











Examples:
| class     | group     | channel      | topic        | exercise        | 
| Buffoons  | Group A   | Test channel | Test topic   | Test exercise   |
| Buffoons  | Group B   | Test channel | Test topic 2 | Test exercise 2 |