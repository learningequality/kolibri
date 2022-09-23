Feature: Super admin cancels import, export or delete tasks
    Super admin needs to be able to cancel import, export or delete tasks

  Background:
    Given I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on *Device > Tasks* page

  Scenario: Cancel import task
    Given there is import task in progress
      When I click the *Cancel* button
      Then I see the red '!' icon
        And I see the task has been labeled as *Canceled*
        And I see the *N of M resources (size)* imported
        And I see the *Clear* button for the finished task
        And I see the *Clear completed* button

  Scenario: Cancel export task
    Given there is export task in progress
      When I click the *Cancel* button
      Then I see the red '!' icon
        And I see the task has been labeled as *Canceled*
        And I see the *N of M resources (size)* exported
        And I see the *Clear* button for the finished task
        And I see the *Clear completed* button

  Scenario: Cancel delete task
    Given there is delete task in progress
      When I click the *Cancel* button
      Then I see the red '!' icon
        And I see the task has been labeled as *Canceled*
        And I see the *N of M resources (size)* deleted
        And I see the *Clear* button for the finished task
        And I see the *Clear completed* button
