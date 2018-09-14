Feature: Coach create exams
  Coach needs to be able to create exams from existing content

  Background:
    Given I am signed in to Kolibri as a coach user
      And I am on the *Coach > Exams* page
      And there is a channel <channel> and topic <topic> that contains exercises

Scenario: Coach creates an exam by selecting full channel to pull questions from
  When I click *New exam* button
  Then I see the *Create a new exam* page
  When I fill in the exam title <exam_title>
    And I fill in the number of questions <number_of_question>
    And I check the <channel> checkbox
  Then I see the snackbar notification that <channel> was added
  When I click *Preview* button
  Then I see the *Preview exam* modal
    And I see lot of questions
  When I click *Randomize questions* button
  Then I see the questions are rearranged
  When I click *Close* button
  Then the modal closes
    And I see the *Create a new exam* page again
  When I click *Finish* button
  Then I see the <exam_title> listed on the *Exams* page

Scenario: Coach creates an exam by browsing to topic to pull questions from
  Given that I created the exam <exam_title>
    But I haven't added any questions yet
    And I see the list of available channels
  When I click the <channel> link
    And I browse the <channel> until I see the <topic>
  When I check the <topic> checkbox
  Then I see the snackbar notification that <topic> was added
  When I click *Preview* button
  Then I see the *Preview exam* modal
    And I see lot of questions
  When I click *Randomize questions* button
  Then I see the questions are rearranged
  When I click *Close* button
  Then the modal closes
    And I see the *Create a new exam* page again
  When I click *Finish* button
  Then I see the <exam_title> listed on the *Exams* page

Examples:
| exam_title     | number_of_question | exercises_questions | channel                | topic                |
| First Quarter  | 5                  | Mathématiques       | Khan Academy (English) | Recognize fractions  |
