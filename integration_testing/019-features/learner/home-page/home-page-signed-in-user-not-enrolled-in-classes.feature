Feature: Signed-in user not enrolled in classes

  Background:
  Given I'm a signed-in user who is not enrolled in any classes

  Scenario: View the home page on a device with disabled access to unassigned content
    Given that access to unassigned content is not allowed (*Signed in learners should only see resources assigned to them in classes* is selected in device settings)
    When I go to the *Home page*
    Then I see *You are not enrolled in any classes* under *Your classes*

  Scenario: View the home page on a device with enabled access to unassigned content when there aren't any imported channels
    Given that access to unassigned content is allowed (*Signed in learners should only see resources assigned to them in classes* is not selected in device settings)
      And there are no imported channels
    When I go to the *Home page*
    Then I see *You are not enrolled in any classes* under *Your classes*

  Scenario: View the home page on a device with enabled access to unassigned content when there are imported channels
    Given that access to unassigned content is allowed (*Signed in learners should only see resources assigned to them in classes* is not selected in device settings)
      And there are some imported channels
    When I go to the *Home page*
    Then I see the *Explore channels* section
    	And I see the available channel cards
      And I see the *Continue learning on your own* section #if I have interacted with a resource
