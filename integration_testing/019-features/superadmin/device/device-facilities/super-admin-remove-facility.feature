Feature: Remove facility
  Super admin can completely remove a facility and its data from a device

  Background:
    Given I am signed in as a super admin
      And I am at *Device > Facilities*

  Scenario: Successfully remove a facility
    Given there are at least two facilities on my device
     	And my super admin account is not a member of the facility
    When I click the *Options* drop-down for a facility
    	And I click *Remove*
    Then I see the *Remove facility from this device* modal
      And I see that the *I understand the consequences of removing the facility* checkbox is unchecked
      And I see that the *Remove* button is disabled
    When I click the checkbox
      Then I the *Remove* button becomes enabled
    When I click the *Remove* button
    Then the facility disappears
    	And I see a *Removed <facility name> from this device* snackbar message
      And I see that a task has been added to the task manager

  Scenario: View removal task in task manager
    Given I started a task to remove a facility from the device
    When I click *View task manager*
    Then I see the sync task I started
      And I see it is *Waiting*
      And I see a clock icon
      And I see *Remove <facility>*
      And I see the 4 digit unique ID of <facility>
      And I see my username in *Started by 'username'*
    When the removal task begins
    Then I see *Removing facility*
      And I see an indeterminate spinner
      And I don't see a *Cancel* button
    When the removal finishes
    Then I see *Finished*
      And I see a green check
      And I see *Facility successfully removed*
      And I see a *Clear* button

  Scenario: Facility removal fails
    Given a facility removal task is in progress
    When the removal fails
    Then I see *Failed*
      And I see a red error icon
      And I see a *Clear* button
      And I see a *Retry* button

  Scenario: Attempt to remove ones own facility
    Given my super admin account is a member of the <facility>
    When I click *Options* for <facility>
    When I click *Remove facility*
    Then I see the *Cannot remove facility* modal
      And I see *Super admins cannot remove facilities they are a member of*
      And I see other instructions on how I can remove it from the device
      And I see a *Close* button
