Feature: Devices can be provisioned to be in Learn-mode only so that coach and admin features are unavailable

	Scenario: Learners can see special messaging that their device is in a special mode
		When I open the user menu in the top appbar or open the navigation drawer
		Then I see special text messaging showing my device is in Learn-only mode
