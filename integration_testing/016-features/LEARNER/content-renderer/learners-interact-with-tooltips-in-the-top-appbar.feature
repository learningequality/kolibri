Feature: Learners interact with tooltips in the top appbar

  Given I am on the resource page
    And the resource is at least one learning activity

  Scenario: Learners can hover over learning activity icons
    When I hover over or press a learning activity icon in the appbar
      Then I see a tooltip describing what learning activity
    When the resource has multiple learning activities
      Then I see a menu showing multiple learning activities
    When I hover over any of the appbar icons on the right side of the appbar
      Then I see tooltips for each icon
