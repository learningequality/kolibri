Feature: Kolibri users need to be able to view all the content types in all the supported browsers

  Background:
    Given I am signed in to Kolibri

  Scenario: View the MP4 video
    When I open the MP4 video content in the following browsers and operating systems
    	- Firefox/Chrome/Internet Explorer 11+, on Windows
    	- Firefox/Chrome on Linux
    	- Firefox/Chrome/Safari on Mac/iOS
    Then I can see video playing correctly
      And I can see both the captions and the interactive transcript 


  Scenario: Listen the MP3 audio
    When I open the MP3 audio content in the following browsers and operating systems
    	- Firefox/Chrome/Internet Explorer 11+, on Windows
    	- Firefox/Chrome on Linux
    	- Firefox/Chrome/Safari on Mac/iOS
    Then I can hear the audio playing correctly

  Scenario: View the PDF file
    When I open the PDF document in the following browsers and operating systems
    	- Firefox/Chrome/Internet Explorer 11+, on Windows
    	- Firefox/Chrome on Linux
    	- Firefox/Chrome/Safari on Mac/iOS
    Then I can view and read correctly

  Scenario: View the ePUB file
    When I open the ePUB document in the following browsers and operating systems
    	- Firefox/Chrome/Internet Explorer 11+, on Windows
    	- Firefox/Chrome on Linux
    	- Firefox/Chrome/Safari on Mac/iOS
    Then I can view and read correctly

  Scenario: Interact with HTML5 app
    When I open the HTML5 app in the following browsers and operating systems
    	- Firefox/Chrome/Internet Explorer 11+, on Windows
    	- Firefox/Chrome on Linux
    	- Firefox/Chrome/Safari on Mac/iOS
    Then I can view and interact correctly with the content

  Scenario: Interact with PLIX HTML5 app
    When I open the PLIX HTML5 app in the following browsers and operating systems
    	- Firefox/Chrome/Internet Explorer 11+, on Windows
    	- Firefox/Chrome on Linux
    	- Firefox/Chrome/Safari on Mac/iOS
    Then I can view and interact correctly with the content

  Scenario: Interact with PhET HTML5 app
    When I open the PhET HTML5 app in the following browsers and operating systems
    	- Firefox/Chrome/Internet Explorer 11+, on Windows
    	- Firefox/Chrome on Linux
    	- Firefox/Chrome/Safari on Mac/iOS
    Then I can view and interact correctly with the content


  Scenario: Interact with Flexbook HTML5 app
    When I open the HTML5 app in the following browsers and operating systems
    	- Firefox/Chrome/Internet Explorer 11+, on Windows
    	- Firefox/Chrome on Linux
    	- Firefox/Chrome/Safari on Mac/iOS
    Then I can view and interact correctly with the content

  Scenario: Interact with FUNZA HTML5 game
    When I open the FUNZA HTML5 game in the following browsers and operating systems
    	- Firefox/Chrome/Internet Explorer 11+, on Windows
    	- Firefox/Chrome on Linux
    	- Firefox/Chrome/Safari on Mac/iOS
    Then I can view and interact correctly with the content

  Scenario: Interact with slideshow content
    When I open a slideshow in the following browsers and operating systems
        - Firefox/Chrome/Internet Explorer 11+, on Windows
        - Firefox/Chrome on Linux
        - Firefox/Chrome/Safari on Mac/iOS
    Then I can view and interact correctly with the content