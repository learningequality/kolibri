Feature: Remove facility
  User can completely remove a facility and its data from a device

  Background:
    Given I am signed in as a super admin
      And I am in *Device > Facilities*

  Scenario: Successfuly remove facility
    Given there are at least two facilities on my device
     And my super admin account is not a member of the <facility>
    When I click *Options* for <facility>
    When I click *Remove facility*
    Then I see the modal to *Remove facility from this device*
      And I see the checkbox is unchecked
      And I see the *Remove facility* button is disabled
    When I click the checkbox
      Then I see the *Remove facility* button is enabled
    When I click *Remove facility*
    Then I see *Removing facility* underneath the <facility> name
      And I see an indeterminate spinner
      And I see a task has been added to the task manager
    When all facility data has been removed
    Then I don't see the facility in the list
      And I see a snackbar that says *Removed <facility> from this device*

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


Examples:
| facility |
| MySchool |
