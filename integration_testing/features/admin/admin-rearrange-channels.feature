Feature: Admin can rearrange channels
  Admins need to be able to customize the order channels appear for Learners and Coaches

  Background:
    Given The user is signed in as an Admin or other user with content management permissions
    And The user is on the *Device > Rearrange Channels* page

  Scenario: User can move a channel
    When The user moves a channel using the mouse or keyboard to a new position
    Then The user sees a success notification

  Scenario: The new channel order is reflected in all parts of the app
    When The user moves a channel
    Then The user sees the new order on the *Rearrange Channels* Page
      And ... the *Manage Device Channels* Page
      And ... the *Your Channels* Page when exporting to a USB drive
      And ... the *Learn > Channels* Page
      And ... the *Coach > Create New Quiz* Page
      And ... the *Coach > Manage Lesson Resources* Page
