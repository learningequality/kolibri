Feature: Learner engages with content of the video kind using transcript
  Leaner can engage with video content using the accompanying transcript feature

  Background:
    Given I am signed in as a learner user
      And there are one or more channels imported on the device with video content containing captions
      And I am on the *Channels* page for a channel with captioned video content

    Scenario: Browse and find captioned video content
      When I am on the *Channels* page for <channel>
      Then I see the *Channels > '<channel>'* breadcrumb
        And I see all the topics for the channel <channel>
      When I click the topic <topic>
      Then I see the *Channels > '<channel'> > '<topic>' breadcrumb
        And I see all the subtopics and resources of the topic <topic>
      When I click the subtopic <subtopic>
      Then I see the *Channels > '<channel'> > '<topic>' > '<subtopic>' breadcrumb
        And I see all the subtopics and resources of the subtopic <subtopic>
        And I recognize <resource> resource as a video by the content type icon in the upper left corner

    Scenario: Open video
      Given that <resource> resource is a video
        When I click the <resource> resource
        Then I see the *Channels > '<channel>' > '<topic>' > '<subtopic>' > '<resource>'* breadcrumb
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
  | channel              | topic | subtopic         | resource        | language_option            | language |
  | Touchable Earth (en) | India | Culture in India | Girl's Clothing | Français, langue française | French   |
