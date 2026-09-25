Feature: Topic folder link navigation

# Comment here

  Background:
    Given there are channels on my device
      And I am on the *Topics* page within the Library tab
      And I am viewing a channel

    Scenario: Navigating into a folder using a header link
    When I click a <channel subtopic> header link in the main content display
    Then I see the main content update to display content within that folder
      And I see that there are breadcrumbs that link to the parent folder(s)
    And Given there are more subfolders within this folder
    Then I see the folder panel on the left
      And I see all subfolders within the topics are links

  Scenario: Navigating into a folder using a folder panel link
    When I click a <channel subtopic> folder link in the folder side panel content display
    Then I see the main content update to display content within that folder
      And I see that there are breadcrumbs that link to the parent folder(s)
    And Given there are more subfolders within this folder
    Then I see the folder panel on the left has also updated
      And I see all subfolders within the topics are links
