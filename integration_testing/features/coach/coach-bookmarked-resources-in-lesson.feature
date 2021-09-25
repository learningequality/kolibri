Feature: Coaches can select and use bookmarked resources in lesson creation

	Scenario: Coaches add a bookmarked resource to a lesson
		Given that I have created a lesson
			And I am on the lesson resource management page
		When I browse the new bookmarks content tree
			And I see a list of bookmarks consisting of only resources and navigable topics
			And I find and select a bookmarked resource via the checkbox
		Then I see a snackbar appear confirming the resource was added to my lesson

	Scenario: Coaches add a multiple bookmarked resources to a lesson
		Given that I have created a lesson
			And I am on the lesson resource management page
		When I browse the new bookmarks content tree
			And I see a list of bookmarks consisting of only resources and navigable topics
			And I find and select multiple bookmarked resources via multiple checkboxes
		Then I see a snackbar appear confirming the resources were added to my lesson
