Feature: Learner engage content recommended
  Learner engage with content on recommended page

  Background:
    Given I am signed in to Kolibri as a Learner user
      And There is a channel <channel> that contains videos and exercises
      And I am on *Learn > Classes page

  Scenario: Learner engage with content on recommended page
  	When I click *Recommended* button
  	Then I see video and exercises contents
  	When I select one video content
  	 And I am on *Learn > Recommended* page
  	Then I see the video content automatically playing

Examples:
  | channel      |
  | Khan Academy |