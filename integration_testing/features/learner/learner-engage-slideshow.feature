Feature: Learner engages with content of the slideshow kind
  Leaner can engage with slideshow content and use all slideshow renderer features

  Background:
    Given I am signed in as a learner user
      And there are one or more channels imported on the device with slideshow content
      And I am on the *Channels* page for a channel with slideshow content

    Scenario: Browse and find slideshow content
      When I am on the *Channels* page for <channel>
      Then I see the *Channels > '<channel>'* breadcrumb
        And I see all the topics for the channel <channel>
      When I click the topic <topic>
      Then I see the *Channels > '<channel>' > '<topic>'* breadcrumb
        And I see all the subtopics and resources of the topic <topic>
        And I recognize <resource> resource as a slideshow by the content type icon in the upper left corner

    Scenario: Open slideshow
      Given that <resource> resource is a slideshow
        When I click the <resource> resource
        Then I see the *'<topic>' > '<resource>'* page
          And I see the <resource> content

    Scenario: Engage with the slideshow content
      When I view a slide that has caption text
      Then I see the caption text beneath the slide image
      When I am viewing the first slide
      Then the left-most pagination dot is filled in with color and the rest of them are white
        And the left arrow button is disabled
        And tapping the left key on my keyboard does nothing
        And swiping the image to the right does nothing
      When I am viewing the last slide
      Then the right-most pagination dot is filled in with color and the rest of them are white
        And the right arrow button is disabled
        And tapping the right key on my keyboard does nothing
        And swiping the image to the left does nothing
      When I am viewing a slide that neither the first nor the last slide
      Then the pagination dot associated with my position in the slideshow is filled with color while the rest are white
        And I can navigate in either direction using the keyboard left and right arrow keys
        And I can use the left and right arrow buttons on the slideshow renderer to navigate the slideshow
        And I can navigate by swiping left or right
      When I click a specific pagination dot
      Then the slideshow presents the slide that is associated with the dot's positional order

    Scenario: Engaging with full screen mode
      When I click the enter full screen button
      Then I view the slideshow renderer in full screen
        And I maintain my position in the slideshow
        And I see left and right arrow buttons on the left and right sides of the screen
        And I see the exit full screen button in the top right corner of the screen
        And I can navigate the content by keyboard, swiping or clicking the left and right arrow buttons
      When I click the exit full screen button or hit ESC
      Then I see the *'<topic>' > '<resource>'* page
        And I maintain my position in the slideshow

Examples:
  | channel           | topic             | resource            |
  | Slideshow Test    | Slideshows!       | Demo Slideshow      |
  | All Slideshows    | Slideshows!       | Jacob's Slideshow   |
