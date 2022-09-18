Feature: Guest engages content channels
  Guest needs to engage with content at the Library page

  Background:
    Given I am on Kolibri sign in page
      And I click the *Explore without account* button
      And there is at least one channel imported on the device
      And I am at the *Learn > Library* page

  Scenario: Guest engages with content at the Library page
    When I click on a channel <channel>
    Then I see the *Browse channel* modal
      And I see all the folders for the channel <channel>
    When I click a folder <folder>
    Then I see the *Channels > '<channel>' > '<folder>'* breadcrumb
      And I see all the subfolders of the <folder> folder if there are such
    When I click the subfolder <subfolder>
    Then I see the *Channels > '<channel>' > '<folder>' > '<subfolder>'* breadcrumb
      And I see all the content items of the subfolder <subfolder> of the <folder> folder for the channel <channel>
    When I click the <content_item> content item
    Then I see the *Channels > '<channel>' > '<folder>' > '<subfolder>' > '<content_item>'* breadcrumb
    When I click on the <content_item> card
    Then I see the <content_item> page
    	And I am able to interact with the resource

Examples:
  | channel        | folder    | subfolder | content_item                   |
  | Kolibri Demo 1 | Science  | Physics  | Intro to springs and Hooke's law |
