Feature: Admin exports practice quizzes from the device

  Scenario: Admin (or user with device permissions) exports practice quizzes from the device
    Given that I have device permissions
      And I am at 'Device > Channels' page
    When I have one or more practice quiz selected
      And I click the 'Export' button in the bottom bar
    Then I see an dialog appear prompting for an export destination
