Feature: Learner interacts with slideshow resource
  Leaner can engage with slideshow resource and use all slideshow renderer features

  Background:
    Given I am signed in as a learner user
      And there is at least one channel with slideshow resource imported on the device
      And I am at the *Browse channel* page for a channel with slideshow resource

    Scenario: Learner browses for and opens a slideshow resource
      When I am on the *Browse channel* page
      Then I see the channel name, logo and description
        And I see all the folders for the channel
      When I click on a folder
      Then I see the *'<channel>' > '<folder>'* breadcrumb
        And I see all the subfolders and resources of the folder
        When I click on the slideshow resource card
        Then I see the *'<folder>' > '<resource>'* page
          And I see the slideshow resource

    Scenario: Learner interacts with a slideshow resource
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

    Scenario: Learner interacts with the full screen mode
      When I click the enter full screen button
      Then I view the slideshow renderer in full screen
        And I maintain my position in the slideshow
        And I see left and right arrow buttons on the left and right sides of the screen
        And I see the exit full screen button in the top right corner of the screen
        And I can navigate the resource by keyboard, swiping or clicking the left and right arrow buttons
      When I click the exit full screen button or hit ESC
      Then I see the *'<folder>' > '<resource>'* page
        And I maintain my position in the slideshow
