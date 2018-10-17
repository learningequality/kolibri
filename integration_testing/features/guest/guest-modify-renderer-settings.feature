Feature: Guest modify renderer settings
  Guest needs to be be able to modify renderer settings and these settings must be preserved within a session

  Background:
    Given I am not signed in
    And I am viewing the <content_item> content item

  Scenario: Guest modifies the media player's volume
    Given <content_item> is a video/audio
    And I modify the volume to <volume_level>
    Then If I visit another video/audio the volume should be <volume_level>

  Scenario: Guest modifies the media player's playback rate
    Given <content_item> is a video/audio
    And I modify the playback rate to <playback_rate>
    Then If I visit another video/audio the playback rate should be <playback_rate>

  Scenario: Guest mutes the media player
    Given <content_item> is a video/audio
    And I mute the player
    Then If I visit another video/audio the player should be muted

  Scenario: Guest modifies the epub renderer's theme
    Given <content_item> is an epub
    And I modify the theme to <theme>
    Then If I visit another epub, the renderer should be using the <theme> theme

  Scenario: Guest modifies the epub renderer's font size
    Given <content_item> is an epub
    And I modify the font size to <font_size>
    Then If I visit another epub, the renderer should be using the <font_size> font size

    Examples:
      | content_item                     | volume_level | playback_rate | theme | font_size |
      | Intro to springs and Hooke's law | 50%          | 2x            | sepia | 12px      |
