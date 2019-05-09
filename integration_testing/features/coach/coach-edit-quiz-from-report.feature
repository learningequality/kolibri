  # START testing this scenario with a FRESH DB (make a copy of the current if you want to reuse it later), and use the `kolibri manage importusers your-csv-file.csv` command to import a set of users for this case.


Feature: Previewing and editing a quiz from the *Report* tab
  Class and facility coaches need to be able to preview and edit details for quizzes directly from the *Report* tab

  Background:
    Given I am signed in to Kolibri as a class or facility coach
      And I am at *Coach > '<class>' > Reports > Quizzes* tab
      And there is a <quiz> quiz in a class <class>
      And the <quiz> quiz is either inactive, or active and assigned to some learner(s)

  Scenario: Preview quiz
    When I click to open the <quiz> report
    Then I see the *Report* sub-tab with the list of learners
      And I see the *Difficult questions* sub-tab 
    When I click the *Options* button
      And I select the *Preview* option
    Then I see a full-screen modal *Preview of quiz '<quiz>'*
      And I see the list of <quiz> quiz questions
    When I click the *X* button to close the preview
    Then I see the <quiz> *Report* sub-tab again

  Scenario: Edit quiz
    When I click to open the <quiz> report
    Then I see the *Report* sub-tab with the list of learners
      And I see the *Difficult questions* sub-tab 
    When I click the *Options* button
      And I select the *Edit details* option
    Then I see a full-screen modal *Edit details for '<quiz>'*
    When I finish editing the details of the quiz
      And I click *Save changes* button
    Then I see the <quiz> *Report* sub-tab again

Examples:
| class      | quiz    |
| Explorers  | Count 1 |