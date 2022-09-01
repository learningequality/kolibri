Feature: Guest interacts with the View folder resources side panel
	By opening the side panel a guest user can see content from the current folder
	and can go to the next folder of the channel

	Background:
		Given I am browsing Kolibri as a Guest user
      And I click the *Explore without account* button
      And there is at least one channel with folders imported on the device
      And I am at the *Learn > Library* page

	Scenario: Guest user selects a resource from the side panel
		When I click on a channel <channel>
    Then I see the *Browse channel* modal
      And I see all the folders for the channel <channel>
    When I click a <content_item> card from any of the folders
    Then I see the <content_item> page
    When I click the *View folder resources* icon
    Then I see the titles of the available folder resources listed in the side panel
    When I click on a title
    Then I see the <content_item> page for the selected resource

  Scenario: Guest user goes to the next folder from the side panel
    When I click on a channel <channel>
    Then I see the *Browse channel* modal
      And I see all the folders for the channel <channel>
    When I click a <content_item> card from the first folder
    Then I see the <content_item> page
    When I click the *View folder resources* icon
    Then I see the titles of the available folder resources listed in the side panel
    	And at the bottom of the panel I see *Next folder*, the folder's name and an arrow
    When I click the *Next folder* section
    Then I see the *Browse channel* modal
    	And I see all the resources for the selected folder

  Scenario: Guest user goes back to the channel from the side panel
    Given I'm viewing a <content_item> page in the last folder of a channel <channel>
    When I click the *View folder resources* icon
    Then I see the titles of the available folder resources listed in the side panel
    	And at the bottom of the panel I see *Next folder*, the channel <channel> name and an arrow
    When I click the *Next folder* section
    Then I see the *Browse channel* modal
    	And I see the folders and resources of the channel <channel>

	Examples:
	| channel     | content_item       |
	| QA Channel  | Intro to addition  |
