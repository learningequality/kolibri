"""
Kolibri Load Test - HAR-based Lesson Flow

This Locust test replays a recorded HAR file containing a lesson flow.
Configuration is passed via environment variables.

HAR files are portable across Kolibri versions - static file URLs are
automatically rewritten to match the target Kolibri version.

Usage:
    KOLIBRI_HAR_FILE=path/to/file.har \\
    KOLIBRI_VERSION=0.18.4 \\
    KOLIBRI_FACILITY_ID=xyz \\
    KOLIBRI_NUM_USERS=50 \\
    locust -f locustfile.py -u 50 -r 50 --run-time 5m
"""

import itertools
import json
import logging
import os
import random
import re
import time
from typing import ClassVar

import requests
from grouping import group_name
from grouping import not_found_key
from har import drop_unreplayable
from har import parse_har
from kolibri_client import CSRFAdapter
from kolibri_client import static_bundle_version
from kolibri_client import zip_content_origin
from locust import between
from locust import HttpUser
from locust import task
from users import user_number

logger = logging.getLogger(__name__)

# Load configuration from environment variables
HAR_FILE = os.environ["KOLIBRI_HAR_FILE"]
SERVER_URL = os.environ["KOLIBRI_SERVER_URL"]
FACILITY_ID = os.environ["KOLIBRI_FACILITY_ID"]
CLASSROOM_ID = os.environ["KOLIBRI_CLASSROOM_ID"]
LESSON_ID = os.environ["KOLIBRI_LESSON_ID"]
NUM_USERS = int(os.environ.get("KOLIBRI_NUM_USERS", 50))
KOLIBRI_VERSION = os.environ["KOLIBRI_VERSION"]

STATIC_FILENAME_VERSION = static_bundle_version(SERVER_URL, KOLIBRI_VERSION)

# Retry configuration for 503 errors on trackprogress endpoints
# These match frontend behavior by default but can be tuned for load testing
MAX_RETRIES = int(os.environ.get("KOLIBRI_MAX_RETRIES", 5))
DEFAULT_RETRY_DELAY = float(os.environ.get("KOLIBRI_RETRY_DELAY", 5.0))

ENDPOINT_REMAP = {
    # Moved to the user_auth plugin in #14823.
    "/api/auth/facilityusername/": "/auth/api/facilityusername/",
}


def _resolve_endpoint_remap():
    active = {}
    for old, new in ENDPOINT_REMAP.items():
        try:
            if requests.get(SERVER_URL + new, timeout=10).status_code != 404:
                active[old] = new
        except requests.RequestException:
            pass
    return active


ACTIVE_ENDPOINT_REMAP = _resolve_endpoint_remap()

_reported_404_paths = set()


CONTENT_ORIGIN = zip_content_origin(SERVER_URL)

# Load HAR file at module level (before worker processes fork)
# This prevents blocking I/O in on_start() which can cause worker heartbeat failures
_HAR_REQUESTS = drop_unreplayable(
    parse_har(HAR_FILE, STATIC_FILENAME_VERSION), SERVER_URL, CONTENT_ORIGIN
)


class LessonUser(HttpUser):
    """
    Simulates a user completing a lesson with realistic timing variance.

    Each user is assigned a unique username (load_test_1 through load_test_N)
    and logs in without a password (formal facility preset).
    """

    wait_time = between(1, 3)
    host = SERVER_URL
    # Will be set from login response
    user_id = None
    # Will be set from trackprogress POST
    trackprogress_session_id = None

    facility_id = FACILITY_ID
    classroom_id = CLASSROOM_ID
    lesson_id = LESSON_ID

    URL_PARAM_REPLACEMENT: ClassVar[dict] = {
        "/api/logger/userprogress/": "user_id",
        "/api/logger/trackprogress/": "trackprogress_session_id",
        "/learn/api/learnerclassroom/": "classroom_id",
        "/learn/api/learnerlesson/": "lesson_id",
    }

    PARAM_REPLACEMENT: ClassVar[dict] = {
        "facility_id": "facility_id",
        "facility": "facility_id",
        "classroom_id": "classroom_id",
        "classroom": "classroom_id",
        "lesson_id": "lesson_id",
        "lesson": "lesson_id",
        "user_id": "user_id",
        "user": "user_id",
        "username": "username",
    }

    _user_counter = itertools.count()

    def on_start(self):
        """Initialize user and assign username"""
        user_num = user_number(
            self.environment.runner.worker_index,
            self.environment.parsed_options.processes or 1,
            next(self._user_counter),
            NUM_USERS,
        )
        self.username = f"load_test_{user_num}"
        # Store the POST request for retry
        self.trackprogress_init_request = None

        # Mount CSRF adapter for all HTTP/HTTPS requests
        csrf_adapter = CSRFAdapter()
        self.client.mount("http://", csrf_adapter)
        self.client.mount("https://", csrf_adapter)

    def _make_request_with_retry(self, method, path, content=False, **kwargs):
        """
        Make HTTP request with retry logic for 503 errors on trackprogress endpoints.

        Matches the retry behavior in useProgressTracking.js:
        - Only retries on 503 status codes
        - Respects Retry-After header if present
        - Falls back to default 5 second delay
        - Maximum of 5 retry attempts

        Args:
            method: HTTP method ('get', 'post', 'put', etc.)
            path: URL path
            content: Send the request to the content origin, not the server
            **kwargs: Additional arguments to pass to the request

        Returns:
            Response object
        """
        is_trackprogress = "/api/logger/trackprogress" in path
        origin = CONTENT_ORIGIN if content else ""
        name = group_name(path, content=content)

        for attempt in range(MAX_RETRIES):
            method_func = getattr(self.client, method)
            response = method_func(origin + path, name=name, **kwargs)

            # Only retry trackprogress requests with 503 status
            if (
                is_trackprogress
                and response.status_code == 503
                and attempt < MAX_RETRIES - 1
            ):
                # Check for Retry-After header
                retry_after = response.headers.get("Retry-After")
                if retry_after:
                    try:
                        # Retry-After is in seconds
                        delay = float(retry_after)
                    except (ValueError, TypeError):
                        delay = DEFAULT_RETRY_DELAY
                else:
                    delay = DEFAULT_RETRY_DELAY

                # Wait before retrying
                time.sleep(delay)
                continue

            # Return response if not 503, or if we've exhausted retries
            return response

        return response

    def _extract_trackprogress_session_id(self, response):
        """
        Extract and store trackprogress session ID from a successful response.

        Args:
            response: Response object from trackprogress POST request

        Returns:
            bool: True if session ID was successfully extracted
        """
        if response.status_code in [200, 201]:
            try:
                trackprogress_data = response.json()
                session_id = trackprogress_data.get("session_id")
                if session_id:
                    self.trackprogress_session_id = session_id
                    return True
            except (json.JSONDecodeError, KeyError):
                pass
        return False

    def _handle_trackprogress_init(self, path, kwargs):
        """
        Handle trackprogress POST request - store for potential retry.

        Args:
            path: Request path
            kwargs: Request kwargs
        """
        self.trackprogress_init_request = {"path": path, "kwargs": kwargs.copy()}
        self.trackprogress_session_id = None

    def _ensure_trackprogress_session(self, method):
        """
        Ensure trackprogress session is established before update requests.

        If no session exists, retry the initialization POST. If still unsuccessful,
        log a failure and return False.

        Args:
            method: HTTP method of the current request

        Returns:
            bool: True if session is established, False otherwise
        """
        if self.trackprogress_session_id:
            return True

        # Try to establish session by retrying init request
        if self.trackprogress_init_request:
            init_response = self._make_request_with_retry(
                "post",
                self.trackprogress_init_request["path"],
                **self.trackprogress_init_request["kwargs"],
            )
            self._extract_trackprogress_session_id(init_response)

        # Check if we succeeded
        if not self.trackprogress_session_id:
            # Record failure in Locust stats
            self.environment.events.request.fire(
                request_type=method.upper(),
                name="/api/logger/trackprogress/{id}/ (no session)",
                response_time=0,
                response_length=0,
                exception=Exception("No trackprogress session established"),
            )
            return False

        return True

    def _remap_endpoint(self, path):
        for old, new in ACTIVE_ENDPOINT_REMAP.items():
            if path.startswith(old):
                return new + path[len(old) :]
        return path

    def _note_404(self, path):
        key = not_found_key(path)
        if key not in _reported_404_paths:
            _reported_404_paths.add(key)
            logger.warning("404 (moved/renamed, not remapped?): %s", key)

    def _parameterize_url(self, path):
        """
        Replace dynamic IDs in URL path with actual values.

        Args:
            path: Original URL path from HAR

        Returns:
            str: Parameterized path with actual IDs
        """
        for url_fragment, value_key in self.URL_PARAM_REPLACEMENT.items():
            actual_value = getattr(self, value_key, None)
            if actual_value is not None and url_fragment in path:
                pattern = re.escape(url_fragment) + r"[^/]+"
                replacement = f"{url_fragment}{actual_value}"
                return re.sub(pattern, replacement, path)

        return path

    def _extract_session_data(self, path, method, response):
        """
        Extract and store session data from responses (user ID, trackprogress session ID).

        Args:
            path: Request path
            method: HTTP method
            response: Response object
        """
        # Extract user ID from login response
        if (
            path == "/api/auth/session/"
            and method == "post"
            and response.status_code == 200
        ):
            try:
                session_data = response.json()
                self.user_id = session_data.get("user_id") or session_data.get("id")
            except (json.JSONDecodeError, KeyError):
                pass

    def _swap_param_value(self, argname, value, object):
        if argname in object and value is not None:
            object[argname] = value

    def _swap_params(self, object):
        for param, value_key in self.PARAM_REPLACEMENT.items():
            actual_value = getattr(self, value_key, None)
            self._swap_param_value(param, actual_value, object)

    def _execute_request(self, req):
        """
        Execute a single request from the HAR replay.

        Args:
            req: Request dict with 'method', 'path', 'body', 'params', etc.
        """
        # Build request kwargs
        kwargs = {}
        if "body" in req:
            # Make a copy to avoid mutating the shared request structure
            kwargs["json"] = req["body"].copy()
            self._swap_params(kwargs["json"])
        if "params" in req:
            # Make a copy to avoid mutating the shared request structure
            kwargs["params"] = req["params"].copy()
            self._swap_params(kwargs["params"])

        # Identify request type
        path = self._remap_endpoint(req["path"])
        method = req["method"]
        is_trackprogress_post = (
            path == "/api/logger/trackprogress/" and method == "post"
        )
        is_trackprogress_update = "/api/logger/trackprogress/" in path and method in [
            "put",
            "patch",
        ]

        # Handle trackprogress initialization
        if is_trackprogress_post:
            self._handle_trackprogress_init(path, kwargs)

        # Parameterize URLs with dynamic IDs
        path = self._parameterize_url(path)

        # Ensure session exists for trackprogress updates
        if is_trackprogress_update and not self._ensure_trackprogress_session(
            req["method"]
        ):
            return

        # Execute request with retry logic
        response = self._make_request_with_retry(
            req["method"],
            path,
            content=req.get("content", False),
            **kwargs,
        )

        if response.status_code == 404:
            self._note_404(path)

        # Extract session data from responses
        self._extract_session_data(path, req["method"], response)

        # Extract trackprogress session ID from POST response
        if is_trackprogress_post:
            self._extract_trackprogress_session_id(response)

    @task
    def lesson_flow(self):
        """
        Complete lesson with jittered timing (±20%).

        Timing variance causes users to desynchronize over time:
        - T=0s: Thundering herd (all users start together)
        - T=10s: Starting to desynchronize
        - T=60s: Continuous but spiky load
        - T=300s: Fully desynchronized, realistic distribution
        """
        for req in _HAR_REQUESTS:
            # Execute the request
            self._execute_request(req)

            # Wait with jitter before next request
            if "delay_min" in req:
                time.sleep(random.uniform(req["delay_min"], req["delay_max"]))
