Feature: View picture passwords
	Class coaches need to be able to view and print the passwords of learners with picture passwords

  Background:
    Given I am signed in as a class coach
      And I am at *Coach > Class home* for a specific class
      And there are learners enrolled in the class
      And the *Picture password* option is enabled at *Facility > Settings*

  Scenario: Coach can view the picture passwords of the learners
    When I click the *View passwords* button
    Then I see the *All passwords* page
    	And I see the *All passwords* table with *Name*, *Username* and *Password* columns
    	And I see a *Print* button
    	And I can see the picture passwords of all the learners enrolled in the class

  Scenario: Coach can print the *All passwords* table
    Given I am at *Coach > Class home > All passwords*
    When I click the *Print* button
    Then I see the *Print passwords* modal
    	And I see a *Print with images* radio button selected by default
    	And I see a *Print with text only* radio button
    	And I see a preview of what I am about to print
    When I click the *Continue* button
    Then I can preview the generated document
    	And I can print it
