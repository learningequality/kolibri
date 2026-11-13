Feature: Learner engages with a video resourceS reading the transcript
  Leaner can interact with video resource using the accompanying transcript feature

  Background:
    Given I am signed in as a learner user
      And there is one or several channels imported on the device with video resource containing captions
      And I am on the *Browse channel* page for a channel with captioned video resource

    Scenario: Learner browses and opens a captioned video resource
      When I am at the *Browse channel* page for a channel
      Then I see the channel name, logo and description
        And I see all the folders for the channel
      When I click the folder
      Then I see the *'<channel'> > '<folder>' breadcrumb
        And I see all the subfolders and resources of the folder
      When I click on a video resource card
      Then I see the *'<channel>' > '<folder>' > '<subfolder>' > '<resource>'* breadcrumb
        And I see the video player
        And I see a *CC* button to control captions
        And I see a *Globe* button to control caption language

    Scenario: Learner interacts with the captioned video resource controls
      When I click the *CC* button
      Then I see an option for *Subtitles*
        And I see an option for *Transcript*
      When I click *Subtitles*
      Then I see captions overlaid as subtitles on the video
      When I click *Transcript*
      Then I see a transcript of the captions alongside the video
      When I click the *Globe* button
      Then I see the a list with the available languages
      When I select a language
      Then I see the subtitles in the selected language
        And I see the transcript in the selected language

    Scenario: Learner interacts with the transcript
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
