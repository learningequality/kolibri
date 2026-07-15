"""Shared pytest configuration for the debian-server tests."""

import os
import sys

# Make scripts/ importable so tests can import the release-tooling modules
# (launchpad_copy, generate_changelog) by their top-level names.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
