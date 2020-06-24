Feature: Managing facility tasks
  Users need to be able to view and manage the tasks for their facility

  Background:
    Given I am signed in as a super admin
      And I have at least one facility on my device
      And I am in *Device > Facilities*
      And I successfully started a sync task
      And I see at least one task in the task manager

  Scenario: Sync task is successful
    When I click *View task manager*
    Then I see the sync task I started
      And I see it has the *Waiting* status
      And I see a clock icon
      And I see the name of the device it is syncing with
      And I see the 4 digit unique ID of the device it is syncing with
      And I see an icon for the OS of the device
      And I see the network address of the device it is syncing with
      And I see my username in *Started by '<username>'*
      And I see a *Cancel* button for the task
    When the sync task begins
    Then I see *1 of 7 - Establishing connection*
      And I see an indeterminate spinner
    When this step is finished
    Then I see *2 of 7 - Remotely preparing data*
    When this step is finished
    Then I see *3 of 7 - Receiving data*
    When this step is finished
    Then I see *4 of 7 - Locally integrating received data*
    When this step is finished
    Then I see *5 of 7 - Locally preparing data to send*
    When this step is finished
    Then I see *6 of 7 - Sending data*
    When this step is finished
    Then I see *7 of 7 - Remotely integrating data*
    When this step is finished
    Then I see *Finished* status
      And I see a green check icon
      And I see how many MB were sent
      And I see how many MB were received
      And I see a *Clear* button for the task
          Scenario: Cancel sync task
    When I click *View task manager*
    Then I see the sync task I started
    When I click *Cancel*
    Then I see a *Cancelled* status for the task
      And I see a red error icon
      And I see a *Clear* button
      And I see a *Retry* button

  Scenario: Successfully retry a errored sync task
    When I click *View task manager*
    Then I see the sync task I started
    When there is an error with the sync task
    Then I see *X of 7: Failed*
      And I see a red error icon
      And I see a *Clear* button
      And I see a *Retry* button
    When I click *Retry*
    Then I see the sync task resume at step *X of 7*

  Scenario: Clear a single sync task
    Given a task has finished
      When I click *View task manager*
      Then I see the finished sync tasks
      When I click *Clear*
      Then I don't see the task in the list

  Scenario: Clear all completed tasks from task manager page
    Given at least one task has finished
      And I am on the task manager page
    When I click *Clear completed*
    Then I don't see any tasks
        Scenario: Clear all compeleted tasks from *Device > Facilities*
    Given at least one task has finished
      And I am in *Device > Facilities*
      And I see *X of X task(s) complete*
      And I see a progress bar
    When I click *Clear completed*
    Then I don't see *X of X task(s) complete*
    #this is not on *Tasks* page, but on *Facilities*
      And I don't see a progress bar
      And I don't see *Clear completed*


Examples:
| facility | peer   | username |
| MySchool | MyPeer | pincop   |
