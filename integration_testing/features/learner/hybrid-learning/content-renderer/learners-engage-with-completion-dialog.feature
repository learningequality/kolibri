Feature: Learners engages with completion dialog

  Given that I have completed a resource
    And the completion dialog appears on my screen

  Scenario: Learners can choose to stay and practice
    When I click the *Stay and practice* button
    Then the modal dialog closes
      And I am back on the content page

  Scenario: Learners can choose to move on to the next resource
    When I click the *Move on* button
    Then the modal dialog closes
      And I am on the content page for the next resource in the lesson or topic

  Scenario: Learners can choose to move on to a relevant, related resource
    When I click one of the resources under the relevant resources section
    Then the modal dialog closes
      And I am on the content page for the relevant resource

  Scenario: Learners can choose to exit the dialog
    When I click the close button on the modal dialog
    Then the modal dialog closes
      And I am back on the content page
