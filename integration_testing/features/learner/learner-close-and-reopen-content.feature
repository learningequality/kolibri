Feature: Learner closes and reopens content
  Learner needs to be redirected to where they left off when they reopen a content item

  Background:
    Given I am signed in to Kolibri as a learner user
      And I have previously interacted with the <content_item> content item

  Scenario: Learner reopens a video/audio within a lesson
    Given <content_item> is a video/audio
      When I reopen it within a lesson
      Then the video/audio starts playing at the timecode where I had left it off

  Scenario: Learner reopens a video/audio through *Channels* or *Recommended*
    Given <content_item> is a video/audio
      When I reopen it through *Channels* or *Recommended*
      Then the video/audio starts playing at the timecode where I had left it off

  Scenario: Learner reopens an epub within a lesson
    Given <content_item> is an epub
      When I reopen it within a lesson
      Then the epub opens at the page I left off at

  Scenario: Learner reopens an epub through *Channels* or *Recommended*
    Given <content_item> is an epub
      When I reopen it through *Channels* or *Recommended*
      Then the epub opens at the page I left off at

  Scenario: Learner reopens a pdf within a lesson
    Given <content_item> is a pdf
    When I reopen it within a lesson
    Then the pdf opens at the page I left off at

  Scenario: Learner reopens a pdf through *Channels* or *Recommended*
    Given <content_item> is a pdf
    When I reopen it through *Channels* or *Recommended*
    Then the pdf opens at the page I left off at

Examples:
  | content_item                     |
  | Intro to springs and Hooke's law |
