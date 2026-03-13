# Provisioning and Seeding Dev Data

A fresh `KOLIBRI_HOME` needs device provisioning, users, and content to be useful. The `integration_testing/load_testing/` toolkit handles all of this via the REST API.

Start the Kolibri server first, then provision and seed:

```bash
cd integration_testing/load_testing
python loadtest.py --server http://localhost:8000 --username admin --password admin setup
```

This creates a superuser (`admin`/`admin`), a "Load Test Facility" with a "Load Test Class" classroom, 10 learner accounts (`load_test_1` through `load_test_10`, password: `password`), imports the QA channel from Studio, and creates a lesson with diverse content types.

See `integration_testing/load_testing/kolibri_client.py` for the API client that can also be used programmatically.
