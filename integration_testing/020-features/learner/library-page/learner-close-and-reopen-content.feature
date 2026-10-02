Feature: Learner closes and reopens content
  Learner needs to be redirected to where they left off when they reopen a content item

  Background:
    Given I am signed in to Kolibri as a learner user
      And I have previously interacted with the resource

  Scenario: Learner reopens a video/audio within a lesson
    Given the resource is a video/audio
      When I reopen it within a lesson
      Then the video/audio starts playing at the timecode where I had left it off

  Scenario: Learner reopens a video/audio through *Library* or *Bookmarks*
    Given the resource is a video/audio
      When I reopen it through *Library* or *Bookmarks*
      Then the video/audio starts playing at the timecode where I had left it off

  Scenario: Learner reopens an epub within a lesson
    Given the resource is an epub
      When I reopen it within a lesson
      Then the epub opens at the page which I had previously reached

  Scenario: Learner reopens an epub through *Library* or *Bookmarks*
    Given the resource is an epub
      When I reopen it through *Library* or *Bookmarks*
      Then the epub opens at the page which I had previously reached

  Scenario: Learner reopens a pdf within a lesson
    Given the resource is a pdf
    When I reopen it within a lesson
    Then the pdf opens at the page which I had previously reached

  Scenario: Learner reopens a pdf through *Library* or *Bookmarks*
    Given the resource is a pdf
    When I reopen it through *Library* or *Bookmarks*
    Then the pdf opens at the page which I had previously reached
