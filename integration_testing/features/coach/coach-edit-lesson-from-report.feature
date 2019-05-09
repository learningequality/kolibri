  # START testing this scenario with a FRESH DB (make a copy of the current if you want to reuse it later), and use the `kolibri manage importusers your-csv-file.csv` command to import a set of users for this case.

Feature: Edit lesson details and manage resources from the lesson *Report* tab
  Class and facility coaches need to be able to edit details and manage resources directly from the *Report* tab

  Background:
    Given I am signed in to Kolibri as a class or facility coach
      And I have created a <lesson> lesson in a class <class>
      And the <lesson> lesson contains one or more resources
      And the <lesson> lesson is either inactive, or active and assigned to some learner(s)

  Scenario: Edit lesson details
    When I go to *Coach > '<class>' > Reports > Lessons* tab
      And I click to open the <lesson> report
    Then I see the *Report* sub-tab with <lesson> resources
      And I see the *Learners* sub-tab with a list of the learners who have taken the lesson
    When I click the *Options* button
      And I select the *Edit details* option
    Then I see a full-screen modal *Edit details for '<lesson>'*
    When I finish editing the details of the lesson
      And I click *Save changes* button
    Then I see the <lesson> *Report* sub-tab again

  Scenario: Manage lesson resources
    When I go to *Coach > '<class>' > Reports > Lessons* tab
      And I click to open the <lesson> report
    Then I see the *Report* sub-tab with <lesson> resources
      And I see the *Learners* sub-tab with a list of the learners who have taken the lesson
    When I click the *Options* button
      And I select the *Manage resources* option
    Then I see a full-screen modal *Manage resources in '<lesson>'*
    When I finish adding to or removing resources from the lesson
      And I click the *Finish* button
    Then I see the <lesson> *Report* sub-tab again

Examples:
| class      | lesson  |
| Explorers  | Count 1 |