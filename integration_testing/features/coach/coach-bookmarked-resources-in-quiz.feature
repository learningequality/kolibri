Feature: Coaches can select and use bookmarked resources in quiz creation

	Scenario: Coaches add a bookmarked exercise to a quiz
		Given that I am creating a quiz
		When I browse the new bookmarks content tree
			And I see a list of bookmarks consisting of only exercises and topics
			And I find and select a bookmarked exercise via the checkbox
		Then I see a snackbar appear confirming the exercise was selected

	Scenario: Coaches add a bookmarked topic to a quiz
		Given that I am creating a quiz
		When I browse the new bookmarks content tree
			And I see a list of bookmarks consisting of only exercises and topics
			And I find and select a bookmarked topic via the checkbox
		Then I see a snackbar appear confirming the topic was selected

	Scenario: Coaches add a multiple bookmarked items to a quiz
		Given that I am creating a quiz
		When I browse the new bookmarks content tree
			And I find and select multiple bookmarked items via multiple checkboxes
		Then I see a snackbar appear confirming the items were selected
