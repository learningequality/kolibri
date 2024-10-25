Feature: Signed-in user not enrolled in classes

  Background:
  Given I'm a signed-in user who is not enrolled in any classes

  Scenario: View the home page on a device with disabled access to unassigned content when there aren't any imported channels
    Given that access to unassigned content is not allowed (*Signed in learners should only see resources assigned to them in classes* is selected in device settings)
      And there are no imported channels
    When I go to the *Home page*
    Then I see *You are not enrolled in any classes* under *Your classes*
      And the sections *Continue learning from your classes*, *Recent lessons*, *Recent quizzes*, *Continue learning on your own*, *Explore channels* are not displayed

  Scenario: View the home page on a device with disabled access to unassigned content when there are imported channels
    Given that access to unassigned content is not allowed (*Signed in learners should only see resources assigned to them in classes* is selected in device settings)
      And there are imported resources
    When I go to the *Home page*
    Then I see *You are not enrolled in any classes* under *Your classes*
      And I don't see the sections *Continue learning from your classes*, *Recent lessons*, *Recent quizzes*, *Continue learning on your own*, *Explore channels*

  Scenario: View the home page on a device with enabled access to unassigned content when there aren't any imported channels
    Given that access to unassigned content is allowed (*Signed in learners should only see resources assigned to them in classes* is not selected in device settings)
      And there are no imported channels
    When I go to the *Home page*
    Then I see *You are not enrolled in any classes* under *Your classes*
      And I don't see the sections *Continue learning from your classes*, *Recent lessons*, *Recent quizzes*, *Continue learning on your own*, *Explore channels*

  Scenario: View the home page on a device with enabled access to unassigned content when there are imported channels
    Given that access to unassigned content is allowed (*Signed in learners should only see resources assigned to them in classes* is not selected in device settings)
      And there are some imported channels
    When I go to the *Home page*
    Then I see *You are not enrolled in any classes* under *Your classes*
      And I see the *Continue learning on your own* section #if I have interacted with a resource
      And I see the *Explore channels* section
      And I can click on an a available resource or a channel and navigate to the corresponding page
      And I don't see the sections *Continue learning from your classes*, *Recent lessons*, *Recent quizzes*
