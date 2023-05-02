Feature: Folder skip logic

# Users can get to their resources faster when a resource is nested >2 levels deep and it's the only resource in that file path. As long as there is one folder within level A and B, with no other folders or resources, the file path should be shortened until there are multiple folders and/or resources within level B.

  Background:
    Given there is at least one channel loaded to the device
    	And I am at the <channel> page
      And there are multiple subfolders available within the <channel>
      And I see the folder panel on the left
      And I see content on the right

  Scenario: Example 1 with 2 folders
    Given there is a main folder containing Folder 1
    	And there is a Folder 2 in Folder 1 containing a single resource
    When I look at the contents of the main folder
    Then I see that in the file path the *<Folder 1>* link is disabled
      And I see the *<Folder 2>* link is active
      And I see the resource card
    When I click on the *<Folder 2>* link
    Then I see the following path: *Channel > Main folder > Folder 1 > Folder 2*
    	And I see the card for Folder 2's resource

  Scenario: Example 2 with 4 folders
    Given there is a main folder containing Folder 1 with a nested folder 2 in which there is a resource and Folder 3
    	And there is a nested Folder 4 in Folder 3 in which there is a single resource
    When I look at the contents of the main folder
    Then I see that in the file path the *<Folder 1>* link is disabled
      And I see the *<Folder 2>* link is active
      And I see the resource card of Folder 2's resource
      And I see Folder 3
    When I click on Folder 3
    Then I see the *<Folder 4>* link is active
    	And I see the resource card for Folder 4's resource

  Scenario: Example 3 with 5 folders
    Given there is a main folder containing Folder 2 and Folder 3
    	And Folder 2 contains Folder 4 in which there is a single resource
    	And Folder 3 contains Folder 5 in which there is a single resource
    When I look at the contents of the main folder
    Then I see that in the file path the *<Folder 1>* link is active
      And I see both Folder 2 and Folder 3
    When I click on one of the folders
    Then I see the folder's resource card
    When I click the Folder 1 link in the top bread crumb navigation
    Then I see the contents of both Folder 2 and Folder 5
