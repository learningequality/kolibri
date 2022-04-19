Feature: Learner engages with content of the video kind using transcript
  Leaner can engage with video content using the accompanying transcript feature

  Background:
    Given I am signed in as a learner user
      And there are one or more channels imported on the device with video content containing captions
      And I am on the *Browse channel* page for a channel with captioned video content

    Scenario: Browse and find captioned video content
      When I am on the *Browse channel* page for <channel>
      Then I see the <channel> name, logo and description
        And I see all the folders for the channel <channel>
      When I click the folder <folder>
      Then I see the *'<channel'> > '<folder>' breadcrumb
        And I see all the subfolders and resources of the folder <folder>
      When I click the subfolder <subfolder>
      Then I see the *'<channel'> > '<folder>' > '<subfolder>' breadcrumb
        And I see all the subfolders and resources of the subfolder <subfolder>
        And I recognize <resource> resource as a video by the content type icon in the upper left corner

    Scenario: Open video
      Given that <resource> resource is a video
        When I click the <resource> resource
        Then I see the *'<channel>' > '<folder>' > '<subfolder>' > '<resource>'* breadcrumb
          And I see the <resource> content
          And I see a *CC* button to control captions
          And I see a *Globe* button to control caption language

    Scenario: Engage with the captioned video content controls
      When I click the *CC* button
      Then I see an option for *Subtitles*
        And I see an option for *Transcript*
      When I click *Subtitles*
      Then I see captions overlaid as subtitles on the video
      When I click *Transcript*
      Then I see a transcript of the captions alongside the video
      When I click the *Globe* button
      Then I see the <language_option> option
      When I select <language_option>
      Then I see subtitles in <language>
        And I see the transcript in <language>

    Scenario: Engaging with the transcript
      When the transcript is enabled
        And the video is playing
      Then I see transcript cues highlighted within the transcript
        And I see the transcript automatically scroll to the next cue
      When I hover the mouse over the transcript
      Then the transcript stops scrolling automatically
      When I click a transcript cue
      Then the video seeks to the time of the transcript cue
      When I move the mouse outside of the transcript
      Then the transcript resumes automatically scrolling


Examples:
  | channel              | folder | subfolder         | resource        | language_option            | language |
  | Touchable Earth (en) | India | Culture in India | Girl's Clothing | Français, langue française | French   |
