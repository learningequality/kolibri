  # START testing this scenario with a FRESH DB (make a copy of the current if you want to reuse it later), and use the `kolibri manage importusers your-csv-file.csv` command to import a set of users for this case.


Feature: Previewing and editing a quiz from the *Report* tab
  Class and facility coaches need to be able to preview and edit details for quizzes directly from the *Report* tab

  Background:
    Given I am signed in to Kolibri as a class or facility coach
      And I am at *Coach > '<class>' > Reports > Quizzes* tab
      And there is a <quiz> quiz in a class <class>
      And the <quiz> quiz is either inactive, or active and assigned to some learner(s)
      And I am on the report page for <quiz>

  Scenario: Quizzes can be previewed from the report page
    When I click the *Options* dropdown menu
      And I select the *Preview* option
    Then I see a full-screen modal *Preview of quiz '<quiz>'*
      And I see the list of <quiz> quiz questions
      And I see a preview for the first quiz question
    When I click the button for a different quiz question
      Then I see a preview for that other quiz question

  Scenario: Quiz details can be edited from the report page
    When I click the *Options* dropdown menu
      And I select the *Edit details* option
    Then I see a full-screen modal *Edit details for '<quiz>'*
      And I see form fields for editing the title, status, and recipients (in that order)
    When I finish editing the details of the quiz
      And I click *Save changes* button
    Then I am returned to the report page for <quiz>
      And I see the changes I made reflected in the report header

Examples:
| class      | quiz    |
| Explorers  | Count 1 |
