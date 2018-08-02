Feature: Learner engage content recommended
  Learner engage with content on recommended page

  Background:
    Given I am signed in to Kolibri as a Learner user
      And There is a channel <channel> and topic <topic> that contains exercises
      And I am on *learn > classes page

  Scenario: Learner engage with content on recommended page
  	When I click *Recommended* button
  	Then I see video and exercises contents
  	When I select one video content
  	 And I am on *learn > recommended* page
  	Then I see the video content automatically playing

Examples:
  | channel      |
  | Khan Academy |