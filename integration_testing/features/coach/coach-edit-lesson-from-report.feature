  # START testing this scenario with a FRESH DB (make a copy of the current if you want to reuse it later), and use the `kolibri manage importusers your-csv-file.csv` command to import a set of users for this case.

Feature: Edit lesson details and manage resources from the lesson *Report* tab
  Class and facility coaches need to be able to edit details and manage resources directly from the *Report* tab

  Background:
    Given I am signed in to Kolibri as a class or facility coach
      And I have created a <lesson> lesson in a class <class>
      And the <lesson> lesson contains one or more resources
      And the <lesson> lesson is either inactive, or active and assigned to some learner(s)
      And I am on the report page for <lesson>

  Scenario: Lesson details can be edited from the lesson report page
    When I click the *Options* dropdown menu
      And I select the *Edit details* option
    Then I see the *Edit lesson details for '<lesson>'* page
      And I see form fields for editing the title, description, status, and recipients (in that order)
      And I see a *Resources* section where I can reorder, remove, and preview resources in <lesson>
    When I edit one or more details of the lesson
      And I click *Save changes* button
    Then I am returned to the report page for <lesson>
      And the changes I made are reflected in the report

  Scenario: Lesson resources can be added or removed from the lesson report page
    When I click the *Options* dropdown menu
      And I select the *Manage resources* option
    Then I see the *Manage resources in '<lesson>'* page
    When I finish adding to or removing resources from the lesson
      And I click the *Finish* button
    Then I am returned to the report page for <lesson>
      And the changes to the resources I made are reflected in the report

Examples:
| class      | lesson  |
| Explorers  | Count 1 |
