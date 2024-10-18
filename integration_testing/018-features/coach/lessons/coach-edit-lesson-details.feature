Feature: Coach edits lessons
  Coach needs to be able to edit existing lesson title and description, and to reassign lessons to group(s) or entire class

  Background:
    Given I am signed in to Kolibri as a coach user
      And I am on the *Coach - '<class>' > Lessons > '<lesson>'* page
      And there are 2 or more learner groups
      And there is a previously created lesson with resources

  Scenario: Edit the title and description of an existing lesson
    When I click the *...* button
      And I select the *Edit details* option
    Then I see the *Edit lesson details* page
    When I change the title and description of the lesson
      And I click the *Save changes* button
    Then I see the lesson details page again
    	And I see a *Changes saved* snackbar notification
      And I see that the title of the lesson is changed
    When I click on the title of the lesson
    Then I see the lesson details page
    	And I can see that the description of the lesson is also changed

  Scenario: Cannot change the title of an existing lesson if it is already used
    Given I am at the *Edit lesson details* page
      When I try to rename the channel by entering an existing lesson title
      Then I see the following validation message: *A lesson with this name already exists*
        And I cannot save until I choose another title

  Scenario: Reassign existing lesson to different recipient groups
	  Given I am at the *Edit lesson details* page
	  When I change *Recipients* by selecting one of the available groups
      And I click the *Save changes* button
    Then I am back at the lesson details page
      And the *Recipients* field reflects the changes I made

  Scenario: Assign individual learners
    Given I am at the *Edit lesson details* page
    When I change *Recipients* by selecting *Individual learners*
    Then I see a table listing all of the learners in the class
    When I select one or several learners
      And I click *Save changes*
    Then I am back at the lesson details page
      And the *Recipients* field reflects the changes I made

  Scenario: Preview a lesson resource from the lesson summary page
      When I click on the title of a resource in the lesson
      Then I see the resource
