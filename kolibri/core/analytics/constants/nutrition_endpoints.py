"""
This module contains constants which represent what nutrition fact endpoints
notifications are returned from.
"""
from __future__ import unicode_literals

PINGBACK = "pingback"
STATISTICS = "statistics"

choices = ((PINGBACK, "Pingback"), (STATISTICS, "Statistics"))
