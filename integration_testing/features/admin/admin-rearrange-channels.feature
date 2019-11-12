Feature: Admin can rearrange channels
  Admins need to be able to customize the order channels appear for Learners and Coaches

  Background:
    Given I am signed in as an Admin or other user with content management permissions
    And I am on the *Device > Rearrange Channels* page

  Scenario: User can move a channel
    When I move a channel using my mouse or keyboard to a new position
    Then I see a success notification

  Scenario: The new channel order is reflected in all parts of the app
    When I move a channel
    Then I see the new order on the *Rearrange Channels* Page
      And ... the *Manage Device Channels* Page
      And ... the *Your Channels* Page when exporting to a USB drive
      And ... the *Learn > Channels* Page
      And ... the *Coach > Create New Quiz* Page
      And ... the *Coach > Manage Lesson Resources* Page
