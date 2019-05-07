  # START testing this scenario with a FRESH DB (make a copy of the current if you want to reuse it later), and use the `kolibri manage importusers your-csv-file.csv` command to import a set of users for this case.

Feature: Previewing a quiz from the plan tab
  Class coaches and normal coaches are able to preview quizzes they create in the plan tab

  Background:
    Given I have finished creating a '<quiz>' Quiz A
      And I am signed in to Kolibri as a <class coach> or <coach>
      And the quiz can be inactive or active and assigned to anyone

  Scenario: Preview Quiz A from the plan tab
    When as as a coach I go to Coach and click into the 'Plan' tab
    Then I click into Quiz A report
    Then I should see a a page with the Quiz A's details
      And I should see a list of Quiz A's questions and a preview of each question
      And I should see a dropdown button with options 'Edit Quiz', 'Copy Quiz', 'Delete'


Feature: Quick-edit a quiz from a quiz report page
  Class coaches and normal coaches are able to preview and edit quizzes via a shortcut in the quiz report. This saves them time navigating back to the Plan tab

  Background:
    Given I have a created '<quiz>' Quiz A
      And I am signed in to Kolibri as a <class coach> or <coach>
      And the quiz can be inactive or active and assigned to anyone

  Scenario: Shortcut edit Quiz A from its report
    When I click into the Reports tab
      And I click into the 'Quizzes' sub-tab
    Then I click into Quiz A report
      And I should see a dropdown button with options 'Preview' and 'Edit details'
    When I click 'Preview'
    Then I should see a list of Quiz A's questions
    When I click "Edit details"
    Then I should be redirected to a full-screen modal with editable form fields
