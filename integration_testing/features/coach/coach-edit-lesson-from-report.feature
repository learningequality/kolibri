  # START testing this scenario with a FRESH DB (make a copy of the current if you want to reuse it later), and use the `kolibri manage importusers your-csv-file.csv` command to import a set of users for this case.

Feature: Edit lesson details from its lesson report page
  Class coaches and normal coaches are able to preview quizzes they create in the plan tab

  Background:
    Given I have finished creating a '<lesson>' Lesson A
      And I am signed in to Kolibri as a <class coach> or <coach>
      And the lesson can be inactive or active and assigned to anyone

  Scenario: Edit lesson details from its report page
    When as as a coach I go to Coach and click into the 'Reports' tab
    Then I click into Lesson A report
    Then I should see a sub-tab with Lesson A's resources
      And I should see a sub-tab with a list of the learners who have taken the lesson
    When I click the 'options' dropdown button
      And I click the 'Edit details' option
    Then I should be redirected to a full-screen modal with editable form fields


Feature: Manage lesson resources from its lesson report page
  Class coaches and normal coaches are able to preview quizzes they create in the plan tab

  Background:
    Given I have finished creating a '<lesson>' Lesson A
      And Lesson A contains one or more resources
      And I am signed in to Kolibri as a <class coach> or <coach>
      And the lesson can be inactive or active and assigned to anyone

  Scenario: Manage lesson resources from its report page
    When as as a coach I go to Coach and click into the 'Reports' tab
    Then I click into Lesson A report
    Then I should see a sub-tab with Lesson A's resources
      And I should see a sub-tab with a list of the learners who have taken the lesson
    When I click the 'options' dropdown button
      And I click the 'Manage resources' option
    Then I should be redirected to a full-screen modal with a resource selection tree