Feature: Guest engage content recommended
  Guest engage with content on recommended page

  Background:
    Given I am on *User > Sign in* page
      And I click *Continue as guest* button
      And There is a channel <channel> that contains videos and exercises
      And I am on *Learn > Topic* page

  Scenario: Guest engage with content on recommended page
  	When I click *Recommended* button
  	Then I see video and exercises contents
  	When I select one video content
  	 And I am on *Learn > Recommended* page
  	Then I see the video content automatically playing

Examples:
  | channel      |
  | Khan Academy |