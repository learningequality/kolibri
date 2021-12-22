Feature: Admin deletes practice quizzes from the device

  Scenario: Admin (or user with device permissions) deletes practice quizzes from the device
    Given that I have device permissions
      And I am at 'Device > Channels' page
    When I have one or more practice quiz selected
      And I click the 'Delete' button in the bottom bar
    Then I see a dialog appear confirming my delete action
