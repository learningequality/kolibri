Feature: Browser compatibility testing of all resource types

  Background:
    Given I am signed in to Kolibri
    	And I have imported a channel with all resource types

  Scenario: View .mp3, .bloompub, .bloomd, .pdf, .epub, .h5p, html, .mp4, .webm, .kpub resources in all supported browsers
    When I open one of the supported resource types in the following browsers and operating systems
    	- Firefox/Chrome/Internet Explorer 11+, on Windows
    	- Firefox/Chrome on Linux
    	- Firefox/Chrome/Safari on Mac/iOS
    Then I can see that the resource is displayed correctly
      And I can interact with all of the available options and features of the resource
