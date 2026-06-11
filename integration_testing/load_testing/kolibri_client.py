"""
HTTP client for interacting with Kolibri APIs.
Provides methods for device provisioning, user management, content import, and lesson creation.
"""

import io
import os
import time

import requests
from logger import info
from logger import plain
from logger import success
from requests.adapters import HTTPAdapter
from requests.exceptions import RequestException
from utils import generate_users_csv
from utils import get_or_generate_lesson_resources

TASKS_API_PATH = "/api/tasks/tasks/"
LESSON_TITLE = "Load Test Lesson"
LESSON_DESCRIPTION = "Load test lesson with comprehensive content types"


class CSRFAdapter(HTTPAdapter):
    """
    Adapter that automatically adds CSRF token header to mutating requests.

    Django requires CSRF token in X-CSRFToken header for POST/PUT/PATCH/DELETE requests.
    This adapter extracts the token from cookies and adds it to the request headers.
    """

    def add_headers(self, request, **kwargs):
        """Add CSRF token header for mutating HTTP methods"""
        super().add_headers(request, **kwargs)

        # Only add CSRF token for mutating requests
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            # Extract CSRF token from cookies
            csrf_token = request._cookies.get("kolibri_csrftoken")
            if csrf_token:
                request.headers["X-CSRFToken"] = csrf_token


class KolibriClient:
    """Client for interacting with Kolibri REST APIs"""

    def __init__(self, base_url, username=None, password=None):
        """
        Initialize Kolibri client.

        Args:
            base_url: Base URL of Kolibri server (e.g., 'http://localhost:8000')
            username: Optional admin username for authentication
            password: Optional admin password for authentication
        """
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()

        # Mount CSRF adapter for all HTTP/HTTPS requests
        csrf_adapter = CSRFAdapter()
        self.session.mount("http://", csrf_adapter)
        self.session.mount("https://", csrf_adapter)

        self.classroom_id = None
        self.lesson_id = None

        if username and password:
            self.login(username, password)
        else:
            self.fetch_csrf_token()

    def _url(self, path):
        """Construct full URL from path"""
        return f"{self.base_url}{path}"

    def get_device_info(self):
        """
        Get device information including Kolibri version.

        Returns:
            dict: Device info with kolibri_version, application, etc.
        """
        r = self.session.get(self._url("/api/public/info/"), params={"v": "3"})
        r.raise_for_status()
        return r.json()

    # Device Management

    def is_provisioned(self):
        """
        Check if device is provisioned.

        Uses the public facilities endpoint - if any facilities exist,
        the device must be provisioned.

        Returns:
            bool: True if device is provisioned
        """
        try:
            facilities = self.get_facilities()
            # If there are any facilities, device is provisioned
            return len(facilities) > 0
        except RequestException:
            return False

    def provision_device(self, facility_name, superuser_username, superuser_password):
        """
        Provision device via task API.

        Args:
            facility_name: Name of facility to create
            superuser_username: Username for superuser
            superuser_password: Password for superuser
            preset: Facility preset (default: 'formal' for no-password login)
            device_name: Name for the device

        Returns:
            dict: Job result
        """
        payload = {
            "type": "kolibri.core.device.tasks.provisiondevice",
            "facility": {"name": facility_name},
            "preset": "formal",
            "superuser": {
                "username": superuser_username,
                "full_name": "Load Test Admin",
                "password": superuser_password,
            },
            "language_id": "en",
            "device_name": "Load Test Device",
            "settings": {"learner_can_login_with_no_password": True},
            "allow_guest_access": False,
        }

        # Wait for provisioning to complete
        return self.create_and_wait_for_task(json=payload)

    # Session Management

    def login(self, username, password):
        """
        Login to Kolibri.

        Args:
            username: Username
            password: Password
            facility_id: Optional facility ID

        Returns:
            dict: Session data
        """
        payload = {
            "username": username,
            "password": password,
        }

        r = self.session.post(self._url("/api/auth/session/"), json=payload)
        r.raise_for_status()
        session_data = r.json()

        return session_data

    def fetch_csrf_token(self):
        """
        Fetch CSRF token for session.

        Required for authenticated POST requests.
        """
        r = self.session.put(self._url("/api/auth/session/current/"))
        r.raise_for_status()
        # Token is stored in cookies by requests.Session automatically

    # Facility Management

    def get_facilities(self):
        """
        Get list of facilities.

        Returns:
            list: Facilities
        """
        r = self.session.get(self._url("/api/public/v1/facility/"))
        r.raise_for_status()
        return r.json()

    def get_facility(self, facility_name):
        """
        Get facility by name.

        Args:
            facility_name: Facility name to search for

        Returns:
            dict: Facility data or None if not found
        """
        facilities = self.get_facilities()
        for facility in facilities:
            if facility["name"] == facility_name:
                return facility
        return None

    def get_or_create_facility(self, name):
        """
        Get existing facility or create new one.

        Args:
            name: Facility name to search for

        Returns:
            str: Facility ID
        """
        # Check if facility exists
        facility = self.get_facility(name)
        if facility:
            return facility["id"]

        # Create new facility
        info(f"Creating facility '{name}'...")
        r = self.session.post(
            self._url("/api/auth/facility/create_facility/"),
            json={
                "name": name,
                "preset": "formal",
            },
        )
        r.raise_for_status()
        facility = self.get_facility(name)
        success(f"Facility created: {facility['id']}")
        return facility["id"]

    # Classroom Management

    def get_classroom(self, facility_id, classroom_name):
        """
        Get classrooms for a facility.

        Args:
            facility_id: Facility ID

        Returns:
            list: Classrooms
        """
        r = self.session.get(
            self._url("/api/auth/classroom/"), params={"parent": facility_id}
        )
        r.raise_for_status()
        classrooms = r.json()
        return next((c for c in classrooms if c["name"] == classroom_name), None)

    # User Management

    def import_users_csv(self, csv_content, facility_id):
        """
        Import users from CSV via task API.

        Uploads CSV as multipart/form-data and triggers import task.

        Args:
            csv_content: CSV content as string or bytes
            facility_id: Facility ID
            dryrun: If True, validate only (don't actually import)
            delete: If True, delete users not in CSV

        Returns:
            dict: Job result
        """
        # Convert string to bytes if needed
        if isinstance(csv_content, str):
            csv_bytes = csv_content.encode("utf-8")
        else:
            csv_bytes = csv_content

        # Create file-like object
        csv_file = io.BytesIO(csv_bytes)

        # Prepare multipart form data
        files = {"csvfile": ("users_load_test.csv", csv_file, "text/csv")}

        data = {
            "type": "kolibri.core.auth.tasks.importusersfromcsv",
            "facility": facility_id,
            "locale": "en",
        }

        # POST as multipart/form-data
        return self.create_and_wait_for_task(data=data, files=files)

    # Content Management

    def import_channel(self, channel_id):
        """
        Import channel metadata and content.

        Args:
            channel_id: Channel ID
            baseurl: Source URL (default: Kolibri Studio)

        Returns:
            dict: Job result
        """
        # Step 1: Import channel metadata
        payload = {
            "type": "kolibri.core.content.tasks.remotechannelimport",
            "channel_id": channel_id,
            "channel_name": "Kolibri QA Channel",
        }

        self.create_and_wait_for_task(json=payload)

        # Step 2: Import all content
        payload = {
            "type": "kolibri.core.content.tasks.remotecontentimport",
            "channel_id": channel_id,
            "channel_name": "Kolibri QA Channel",
        }

        return self.create_and_wait_for_task(json=payload)

    def get_content_nodes(self, channel_id, kind=None):
        """
        Get content nodes from a channel.

        Args:
            channel_id: Channel ID
            kind: Optional content kind filter

        Returns:
            list: Content nodes
        """
        params = {"channel_id": channel_id, "available": True}
        if kind:
            params["kind"] = kind

        r = self.session.get(self._url("/api/public/v2/contentnode/"), params=params)
        r.raise_for_status()
        return r.json()

    # Lesson Management

    def get_lesson(self, classroom_id):
        """
        Get lessons for a classroom.

        Args:
            classroom_id: Classroom ID

        Returns:
            list: Lessons
        """
        r = self.session.get(
            self._url("/api/lessons/lesson/"), params={"collection": classroom_id}
        )
        r.raise_for_status()
        existing_lessons = r.json()
        for lesson in existing_lessons:
            if lesson["title"] == LESSON_TITLE:
                return lesson

    def create_lesson(self, channel_id, classroom_id):
        """
        Create a lesson, or return existing lesson if one with the same title exists.

        Args:
            channel_id: Channel ID
            classroom_id: Classroom ID
        Returns:
            str: Lesson ID
        """
        resources = get_or_generate_lesson_resources(self, channel_id)

        # Check if lesson already exists
        existing_lesson = self.get_lesson(classroom_id)
        if existing_lesson:
            return existing_lesson["id"]

        info("Creating lesson...")

        # Create new lesson
        r = self.session.post(
            self._url("/api/lessons/lesson/"),
            json={
                "title": LESSON_TITLE,
                "description": LESSON_DESCRIPTION,
                "resources": resources,
                "active": True,
                "collection": classroom_id,
                "assignments": [classroom_id],  # Assign to whole classroom
            },
        )
        r.raise_for_status()
        lesson = r.json()
        lesson_id = lesson["id"]
        success(f"Lesson created: {lesson_id}")
        return lesson_id

    # High-level Setup Utilities

    def provision_if_needed(self, username, password, facility_name):
        """
        Provision device if not already provisioned.

        Args:
            username: Superuser username
            password: Superuser password
            facility_name: Facility name to create

        Returns:
            dict: Provisioning result with facility_id
        """
        if self.is_provisioned():
            success("Device already provisioned")
            return

        info("Device not provisioned. Provisioning...")

        self.provision_device(
            facility_name,
            username,
            password,
        )

        success("Device provisioned")

        # Login with new credentials
        self.login(username, password)

    def import_users(self, facility_id, num_users, classroom_name):
        """
        Generate CSV and import users via task API.

        Args:
            facility_id: Facility ID to import users into
            num_users: Number of users to create
            classroom_name: Name of classroom

        Returns:
            str: Classroom ID (auto-created from CSV)
        """
        # Generate CSV
        csv_content = generate_users_csv(num_users, classroom_name)

        # Save to local file for reference
        generated_dir = os.path.join(os.path.dirname(__file__), "generated")
        os.makedirs(generated_dir, exist_ok=True)
        csv_path = os.path.join(generated_dir, "users_load_test.csv")

        with open(csv_path, "w", newline="") as f:
            f.write(csv_content)

        success(f"Generated CSV at: {csv_path}")
        plain(f"Uploading and importing {num_users} users...")

        # Upload and import via API
        self.import_users_csv(csv_content, facility_id)

        success("Import completed")

        # Get classroom ID (created automatically by CSV import)
        classroom = self.get_classroom(facility_id, classroom_name)

        if not classroom:
            raise Exception(f"Classroom '{classroom_name}' not found after user import")
        success(f"Classroom created: {classroom['id']}")
        return classroom["id"]

    # Task Monitoring

    def create_task(self, **kwargs):
        """
        Create a task.

        Args:
            payload: Task payload dict

        Returns:
            dict: Job info
        """
        r = self.session.post(self._url(TASKS_API_PATH), **kwargs)
        r.raise_for_status()
        return r.json()

    def wait_for_job(self, job_id, timeout=600, poll_interval=2):
        """
        Wait for a job to complete.

        Args:
            job_id: Job ID
            timeout: Timeout in seconds (default: 600)
            poll_interval: Polling interval in seconds (default: 2)

        Returns:
            dict: Final job state

        Raises:
            TimeoutError: If job doesn't complete within timeout
            Exception: If job fails or is canceled
        """
        start = time.time()

        while time.time() - start < timeout:
            r = self.session.get(self._url(f"{TASKS_API_PATH}{job_id}/"))
            r.raise_for_status()
            job = r.json()

            if job["status"] == "COMPLETED":
                return job
            elif job["status"] in ["FAILED", "CANCELED"]:
                error_msg = job.get("exception", "Unknown error")
                raise Exception(f"Job {job_id} {job['status']}: {error_msg}")

            time.sleep(poll_interval)

        raise TimeoutError(f"Job {job_id} timed out after {timeout} seconds")

    def create_and_wait_for_task(self, **kwargs):
        """
        Create a task and wait for it to complete.

        Args:
            kwargs: Task payload dict
        Returns:
            dict: Final job state
        """
        job = self.create_task(**kwargs)
        return self.wait_for_job(job["id"])
