Feature: Classes page default behaviors

  Background:
    Given I am enrolled in at least one class
    	And I am have assigned classes and quizzes
    When I go to *Home > Classes > Class*
    Then I see any assigned lessons under the header *Your lessons*
      And I see any assigned quizzes under the header *Your quizzes*

  Scenario: Opening a lesson
    When I click on the lesson
    Then I see the lesson resources
      And I see the resources are displayed as single-column cards

  Scenario: Opening a lesson resource
    Given I am viewing a list of resources within a lesson
    When I click on the <resource>
    Then I see the <resource> viewer page
      And I see the correct resource displayed within the renderer

# Note: this is not a new feature - just a new card link to an existing feature
# Testing is for regression prevention
  Scenario: Opening a quiz
      Given I have a quiz assigned
      When I click on the <quiz>
      Then I see the *Quiz renderer* open
        And I am able to engage with the quiz
