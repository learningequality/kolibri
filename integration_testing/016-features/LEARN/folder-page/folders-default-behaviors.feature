Feature: Folders default behaviors

  Background:
    Given there is at least one channel loaded to the device
      And there are subfolders available within <channel>
    When I go to the *Topics* page by clicking a *<channel>* within the library tab
      And I see the folder panel on the left
      And I see content on the right

  Scenario: Folders are displayed
    Given I have not started a search
    Then I see the *Folders* tab is active
      And I see all subfolders within the topics are links

  Scenario: Topic folders are displayed
    Given I have not started a search
    Then I see content organized by folder
      And I see that each folder is a link
      And I see a preview of content within that folder
