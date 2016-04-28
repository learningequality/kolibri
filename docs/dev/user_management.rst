User Management
===============

For now, this is a high-level spec that identifies the major components of a work-in-progress part of Kolibri.
It is a mixture of a descriptive specification for an app, as well as how it interacts with the kolibri.auth
back-end layer below it.
Eventually, it could serve as a user manual.

The User Management allows a user with sufficient permissions to do a number of things related to managing accounts
and roles. It's divided into two distinct sections

Learner Management
------------------

Learner Management provides an interface for:

#. Viewing Classrooms and Learner Groups and a list of the learners they contain.
#. Creating new Classrooms.
#. Creating new Learner Groups.
#. Creating new user accounts and assigning them to Classrooms and Learner Groups.
#. Assigning existing accounts individually or in batches to Classrooms and Learner Groups.
#. Editing a learner's details, including resetting their password.

The main interface of the Learner Management app is the Roster view. Below is a description of the actions directly
available on it, along with a description of how that action will be performed, and what CRUD action it corresponds to
on kolibri.auth models. The baseline is that it requires the following read permissions in order to statically
display data:

#. Read permissions for Classroom and Learner Group lists, in order to determine which LGs belong to which Classrooms
as well as get details about them.
#. Read permissions for Membership objects and Facility Users, in order to determine which learners belong to
the Classrooms and LGs as well as follow the relationship to get details about the Facility User (username, etc).

Moreover certain buttons or widgets will be enabled or disabled depending on the session user's Roles.
For instance, if the session user does not possess the Admin Role for the Facility, then the "Create User" button or
widget will be disabled.

In general if the session user possesses write permissions for some but not all of the objects present, then the UI
elements corresponding to "write actions" (like editing details or deleting the object) will be disabled. This means
that either the server's response should indicate which objects the session user has write permissions for, or that the
these permissions will need to be computed on the front-end. Computing on the front-end could mean duplicating
permissions logic, querying RESTful API endpoints for Memberships and Roles, or querying special non-RESTful API
endpoints.

Role Management
---------------

Role Management will provide an interface for assigning Coach and Admin roles to users.