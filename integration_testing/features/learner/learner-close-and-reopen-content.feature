Feature: Learner close and reopen content
  Learner needs to be redirected to where they left off at when they reopen a piece of content

  Background:
    Given I am signed in to Kolibri as a learner user
    And I have previously interacted with the <content_item> content item

  Scenario: Learner reopens a video/audio within a Lesson
    Given <content_item> is a video/audio
    When I reopen it within a Lesson
    Then The video/audio starts playing where I had left off at

  Scenario: Learner reopens a video/audio through *Channels* or *Recommended*
    Given <content_item> is a video/audio
    When I reopen it through *Channels* or *Recommended*
    Then The video/audio starts playing where I had left off at

  Scenario: Learner reopens an epub within a Lesson
    Given <content_item> is an epub
    When I reopen it within a Lesson
    Then The epub starts where I had left off at

  Scenario: Learner reopens an epub through *Channels* or *Recommended*
    Given <content_item> is an epub
    When I reopen it through *Channels* or *Recommended*
    Then The epub starts where I had left off at

  Scenario: Learner reopens a pdf within a Lesson
    Given <content_item> is a pdf
    When I reopen it within a Lesson
    Then The pdf starts where I had left off at

  Scenario: Learner reopens a pdf through *Channels* or *Recommended*
    Given <content_item> is a pdf
    When I reopen it through *Channels* or *Recommended*
    Then The pdf starts where I had left off at

    Examples:
      | content_item                     |
      | Intro to springs and Hooke's law |
