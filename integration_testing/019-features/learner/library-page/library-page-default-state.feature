Feature: Library page's default state

# Users should see a message when there aren't any imported channels on the device

  Background:
    Given there are no channels imported on the device
    When I go to the *Library* tab
      And I see the filter panel on the left

  Scenario: User navigates to the Library tab while not being signed in
  	Given I am not signed in
    When I go to the *Library* tab
    Then I see the following text: No resources available

	Scenario: User navigates to the Library tab while signed in
  	Given I am signed in
    When I go to the *Library* tab
    Then I see the following text: No resources available
			And I see the following link: Import channels to your device
