Feature: Load Kolibri with content fallback directories
	Kolibri users should see content in any content fallback directories that have been specified.

# CONTENT_FALLBACK_DIRS is a semi-colon (;) separated list of directories that contain directories with Kolibri content. This is used for distributions like Endless to provide system content packages that are automatically loaded on first start-up.

# Follow the steps in the 'Background' to  prepare a the VM, as you need to have the ./kolibri folder and the options.ini file in it, BEFORE going through the Quick Setup Wizard steps.

	Background:
		Given the 'KOLIBRI_HOME' environment variable has been set to a non-existing directory
			And that there is an 'options.ini' file in the Kolibri home folder
			And that there is a '[Paths]' section in the 'options.ini' file
			And that there is a 'CONTENT_FALLBACK_DIRS' variable set to a list of directories
			And these directories exist on disk with Kolibri channel content in them

		Scenario: Running Kolibri for the first time with content fallback directories
			When I open Kolibri in the browser for the first time
				And I complete the "Super admin goes through the 'Quick Start' setup wizard" scenario
			When I am redirected to *Device > Channels*
			Then I see all the channels that exist in the directories specified in 'CONTENT_FALLBACK_DIRS'
