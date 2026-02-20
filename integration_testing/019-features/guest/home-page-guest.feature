Feature: Guest Home Page

  Background:

  Scenario: View the home page on a device with no channels
    Given there are no imported resources
    When I click the *Explore without account* link on the sign-in page
    Then I see a *No resources available* message
      And the sections *Your classes*, *Continue learning from your classes*, *Recent lessons*, *Recent quizzes*, *Continue learning on your own*, *Explore channels* are not displayed

  Scenario: View the home page on a device with channels
    Given there are imported resources
    When I click the *Explore without account* link on the sign-in page
    Then I see the section *Explore channels*
      And I can click on a channel to explore the available resources
