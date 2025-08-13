Feature: Groups
  Coach needs to be able to create, edit and delete groups of learners and needs to be able to view the associated reports

  Background:
    Given I am signed in to Kolibri as a super admin or a coach
      And I am at the *Coach - '<class>' > Groups* page
      And there are lessons with resources and exercises assigned to the class

  Scenario: Groups page overview
    When I look at the *Groups* page
    Then I see the *Groups* title and class info
    	And I see the text *Personalize learning by organizing learners into groups* and a *Learn more* link
    	And I see the *New group* button
    	And I see a table with all of the groups with the following columns: *Group name* and *Learners*
    	And I see an *Options* drop-down for each row with the following options: *Rename group*, *Enroll learners* and *Delete*

  Scenario: Coach creates a group
    When I click on the *New group* button
    Then I see *Create new group* modal
    When I enter a group name
      And I click the *Save* button
    Then the modal closes
      And I see a *Group created* snackbar message
      And I see the new group in the *Groups* table

  Scenario: Review the group details
    When I click on the name of a group
    Then I see the group summary page
    	And I see the group's name and class info
    	And I see the *Enroll learners* button
    	And I see the *...* button with the following options: *Rename group* and *Delete group*
    	And I see a table with the enrolled learners with the following columns: *Full name* and *Username*
    	And I see a *Remove* button in each table row

  Scenario: Edit the group name
    When I click *Options* button
      And I select the *Rename group* option
    Then the *Rename group* modal appears
    When I change the group name
      And I click *Save*
    Then the modal closes
    	And I see a *Changes saved* snackbar message
     	And I see the changed group name

  Scenario: Coach deletes a group
    When I click the *Options* button
      And I select *Delete*
    Then the *Delete group* modal appears
    When I click the *Delete* button
    Then the modal closes
      And I see a *Group deleted* snackbar message
      And I no longer see the deleted group

  Scenario: Coach enrolls learners to a group
    Given I am at the group details page
    When I click the *Enroll learners* button
    Then I see the *Enroll learners into '<group>'* page
      And I see a list of all learners which are not enrolled in the group
    When I select one or several learners
    Then I the *Confirm* button becomes active
    When I click the *Confirm* button
    Then I am back at the group details page
      And I see the list of enrolled learners

  Scenario: Coach removes learners from a group
    Given I am at the group details page
      And I see the list of learners assigned to group
    When I click the *Remove* button for a learner
    Then I see the *Remove user* modal
    When I click the *Remove* button
    Then I am back at the group details page
      And I see the snackbar notification *Learner removed*
      And I see the list of enrolled learners
      And I see that the removed learner is no longer listed
