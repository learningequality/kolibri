Feature: Learner engages content channels
  Learner needs to engage with content at the Library page

  Background:
    Given I am signed in to Kolibri as a Learner user
      And there is at least one channel imported on the device
      And I am at the *Learn > Library* page

  Scenario: Engage with content at the Library page
    When I click on a channel <channel>
    Then I see the *Browse channel* modal
      And I see all the folders for the channel <channel>
    When I click a folder <folder>
    Then I see the *'<channel>' > '<folder>'* breadcrumb
      And I see all the subfolders of the <folder> folder if there are such
    When I click the subfolder <subfolder>
    Then I see the *'<channel>' > '<folder>' > '<subfolder>'* breadcrumb
      And I see all the content items of the subfolder <subfolder> of the <folder> folder for the channel <channel>
    When I click the <content_item> content item
    Then I see the *'<channel>' > '<folder>' > '<subfolder>' > '<content_item>'* breadcrumb
    When I click on the <content_item> card
    Then I see the <content_item> page
    	And I am able to interact with the resource

  Scenario: Lesson content download
    Given a super admin has enabled the *Show 'download' button with resources* option at *Facility > Settings* page
    When I go to *Learn > Classes > Lesson* page
      And I open a lesson
      And I click the *i* icon
    Then I see the *Download resource* button
      And I am able to download the resource

  Scenario: Channel content download
    Given a super admin has enabled the *Show 'download' button with resources* option at *Facility > Settings* page
    When I go to *Learn > Library* page
      And I browse any channel's folders until I open a single resource
      And I click the *i* icon
    Then I see the *Download resource* button
      And I am able to download the resource

Examples:
  | channel        | folder    | subfolder | content_item                   |
  | Kolibri Demo 1 | Science  | Physics  | Intro to springs and Hooke's law |
