Feature: Misc content syncing

  Background:
    Given I am signed in as a learner user

	Scenario: Manage preferred language in user profile #NOT IMPLEMENTED
		When I go to the *Profile* page
		Then I see the *Preferred language* field
			And I see the current preferred language
		When I click *Change*
		Then I see the *Change preferred language* modal
			And I see all of the available languages
		When I select a language
			And I click the *Confirm* button
		Then I am at the *Profile* page
			And I see that the preferred language is changed to the language I selected

	Scenario: Changed position of the *Edit profile* form buttons #NOT IMPLEMENTED
		When I go to the *Profile* page
			And I click *Edit*
		Then I see the *Save* button at the bottom right corner of the form
			And I see the *Cancel* button the left of it

	Scenario: *Download resource* button is changed to *Save to device*
		When I go to a channel resource
			And I click the *View information* button
		Then I see the info panel
			And I see the button *Download resource* is changed to *Save to device*
