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

The main interface of the Learner Management app is currently described in the mailing list thread "Learner Management
app in Kolibri". We assume the session user (the user who is visiting Learner Management) has write permissions for any
object represented in the Learner Management interface. For example, only classrooms and learner groups for which the
user has write permissions will be displayed in the Classroom and Group Selectors. In practice this could mean that
when the page loads a list of classrooms for which the session user is either a coach or admin will be fetched.
At the time of this writing, the only source to determine which users enjoy which permissions is the ``kolibri.auth``
test suite.

.. note:: **Roadmap:**
  Moving forward, we are making digital prototypes for Learner Management. The aim is to get quality feedback from
  likely users to inform the design. IMO it is premature to consider a design as stable prior to such feedback.
  Role Management should be given a similar treatment -- quickly create digital prototypes and get quality feedback.

Learner Management has several conceptual parts. These may not reflect how they're divided as Vue components, so I try
to reference the current implementation below. The application corresponds to ``management/assets/main.vue`` and has
several subcomponents.

Learner Roster
**************

Displays a list of learners determined by the current selectors and filters. Will update automatically based on user
interaction with the selectors and filters. Each item in this list corresponds to a learner and has:

* A checkbox for bulk-selecting learners. Selecting multiple learners enables some actions described below.
* A ``last name, first name`` clickable link. Doing so summons a detail view modal for the learner.
* A ``manage`` button which summons a class and group management modal for that student.

.. note::
  The roster described here corresponds to ``learner-roster.vue``.

The detail view modal displays learner account data and provides a mechanism to reset a learner's password.

The class and group management modal displays a list classrooms to which the student belongs. Each classroom has a
dropdown menu for assinging that learner to a specific group within that classroom. Additionally each classroom has a
checkbox for bulk-selection. Bulk-selecting permits the session user to remove the learner from the selected clasrooms.
Clicking "add" reveals classrooms to which the user doesn't already belong. The learner may be added to those
classrooms by selecting them with the corresponding checkboxes, and simultaneously select a group through the
associated group dropdown.

.. note:: **UI simplification:**
  There are a number of simplifying assumptions made here. For one, kolibri.auth permits a learner to belong to
  multiple groups within a classroom. Here we only allow a learner to belong to one group per classroom in order to
  simplify the UI.

.. note:: **UI simplification:**
  Secondly, kolibri.auth has no notion of being "ungrouped". The kolibri.auth module defines a Membership model that
  associates users to Learner Group and Classroom models. For the purposes of this app, when a learner is assigned to
  a group, then a Membership object to the underlying Learner Group object is created. Membership in a Learner Group
  implies the user is a member of the containing Classroom as well. When a learner is assigned to the "Ungrouped"
  group of a Classroom, it correponds to creating a Membership object associated with the Classroom. In all cases
  re-assigning a user to a different group should both destroy the existing Membership object and create a new one.

.. warning:: **Roadmap:**
  I consider the detail view and class and group management modals to be somewhat unsettled prior to getting quality
  user feedback.


Selectors and filters
*********************

The UI allows the list of learner in the roster to be filtered. This includes:

* A classroom selector. This is populated by a list of classrooms for which the session user has write permissions,
  and the special option "All classrooms". The list of learners is filtered to only show learners who are members of
  the selected classroom, or all learners if "All classrooms" is selected.
* A group selector. This is disabled if "All classrooms" is selected. Otherwise it is populated with the list of
  Learner Groups in the classroom with the special option "All groups". This filters the list of learner analogously
  to the classroom selector.
* Potentially other filters, for example listing learners in alphabetical or reverse-alphabetical order.

.. note::
  The classroom and group selectors are both instances of ``drop-down.vue``. Space is reserved in ``main.vue``
  right now for other filters, however they don't correspond to subcomponents.

Miscellaneous widgets
*********************

Next to the classroom and group selectors are "add" and "remove" buttons. Clicking "add" summons a modal form for
creating a new classroom and a new learner group within the currently selected classroom, respectively. The "add"
button for groups is disabled if "All classrooms" is selected. Clicking "remove" deletes the currently selected
classroom or learner group, respectively. The corresponding "delete" button is disabled if "All classrooms" or
"All groups" is selected.

Space is reserved next to the roster for an information panel to display elaborating information based on the current
selection. Right now it includes only the total # of students which match the criteria determined by the selectors
and filters.

Role Management
---------------

Role Management will provide an interface for assigning Coach and Admin roles to users.

.. note:: **Roadmap:**
  This is currently undesigned. The first step is to clearly identify what actions we wish to enable for the session
  user.
