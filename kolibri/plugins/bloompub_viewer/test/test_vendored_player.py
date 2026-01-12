import os

from django.test import SimpleTestCase

from kolibri.core.content.zip_wsgi import INITIALIZE_SANDBOX_FROM_IFRAME

PLAYER = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "static",
    "bloom",
    "bloomplayer.htm",
)


class VendoredBloomPlayerTestCase(SimpleTestCase):
    def test_player_bootstraps_the_sandbox(self):
        """
        Re-vendoring from upstream overwrites this file, and losing the script fails
        silently: books still render, but storage writes go to the sandbox origin
        instead of the learner's content state.
        """
        with open(PLAYER) as f:
            self.assertIn(INITIALIZE_SANDBOX_FROM_IFRAME, f.read())
