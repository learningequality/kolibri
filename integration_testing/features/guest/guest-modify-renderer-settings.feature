Feature: Guest modifies renderer settings
  Guest needs to be able to modify renderer settings and these settings must be preserved within a session

  Background:
    Given I am not signed in
      And I am viewing the <content_item> content item

  Scenario: Guest modifies the media player's volume
    Given <content_item> is a video/audio
      When I modify the volume to <volume_level>
        And I visit another video/audio
      Then the I hear the volume at the <volume_level>

  Scenario: Guest modifies the media player's playback rate
    Given <content_item> is a video/audio
      When I modify the playback rate to <playback_rate>
        And I visit another video/audio
      Then I see the playback rate is <playback_rate>

  Scenario: Guest mutes the media player
    Given <content_item> is a video/audio
      When I mute the player
        And I visit another video/audio
      Then I don't hear the sound as the player is muted

  Scenario: Guest modifies the epub renderer's theme
    Given <content_item> is an epub
      When I modify the theme to <theme>
        And If I visit another epub
      Then I see the reader is displaying the <theme> theme

  Scenario: Guest modifies the epub renderer's font size
    Given <content_item> is an epub
      When I modify the font size to <font_size>
        And If I visit another epub
      Then I see the reader is displaying the text with the <font_size> font size

    Examples:
      | content_item                     | volume_level | playback_rate | theme | font_size |
      | Intro to springs and Hooke's law | 50%          | 2x            | sepia | 12px      |
