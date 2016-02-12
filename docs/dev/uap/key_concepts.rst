Key Concepts
============

This document is based on `preliminary discussions in our Google docs <https://docs.google.com/document/d/14H3Rc922-IYy6DIEV76_3hXCQPwl6OmKecJkAheTkI4/edit>`_.
It describes the key concepts found in the core auth module, and how they touch on other key concepts from other
modules.

**Kolibri** is a platform with two major purposes:
#. Serve educational content in "disconnected" scenarios, and support students and teachers with self-paced,
peer-interactive, and blended learning practices.
#. Collect information about users and their interaction with that content, and allow it to be synced to other devices
or to a central repository.

The Kolibri platform has two major software components. The **Distributed Application** (which may be referred to as
"Kolibri" or the "App") is a software application which serves content (like videos and exercises), stores user data
to a local database. A Distributed Application is installed and runs on a **Device** (a physical machine such as a
laptop or tablet). The Distributed Application can store data for one or more **Facilities** (corresponding to a
physically colocated educational ecosystem, such as a school), and data for a Facility (or a subset of the data from
a Facility) can be configured to sync to other Devices through a local network, which may have no, limited, or
intermittent internet access. This could be the LAN at a rural school, or a Raspberry Pi configured to be a wifi
hotspot that someone carries to refugee camps. More details on the Distributed Application and user data can be found
below.

A brief foray into the Central Server
-------------------------------------
The other major component of the platform is the **Central Server** (also referred to as the "Hub" or "Data Hub"), a
software application which establishes a two-way data channel between itself and many (or all) deployments. The
Central Server is installed on an online cloud server managed by Learning Equality. Distributed Applications can sync
Facility data up to the Central Server, where users of the Central Server can be granted permissions to view or alter
the data. These changes can be synced back down to a local Device the next time it syncs with the Central Server.

Therefore, Distributed Applications must be able to prove to other Distributed Applications that they are authorized
to sync data for a particular Facility (or subset of data for a Facility). Also, users must have a way to associate
an online (email-verified) account on the Central Server with a Facility, allowing them to log into the Central Server
and access data synced for that Facility. On the Central Server, Facilities can be associated with a "Deployment"
object, and invitations can be sent to others (via entering an email address) to view or manage the Facilities for
that Deployment..

In addition to syncing Facility data with Distributed Applications, we may wish to leverage the Central Server to sync
other data -- such as notifications (from Learning Equality or a deployment partner) and updated content
recommendation model parameters -- down to Distributed Applications.

The Distributed Application's user data model
---------------------------------------------
Here we consider the Distributed Application's user data model in detail, beginning from the initial installation of
Kolibri onto a device. When a user first installs Kolibri on a device, they will be prompted to create a
**Device Owner**, a special kind of user which is associated with that device only, and who must give permission to
make broad changes to the Kolibri installation on that device (such as creating a Facility, or changing configuration
settings). After creating a Device Owner and logging in using those credentials, the user has several options for
configuring Kolibri:
#. The user may choose to create a new Facility, an object which represents the physical "home" of the Deployment, and
could for example be a school or a mobile library. More on Facilities below.
#. If the Device is connected to a network which has another Device running the Distributed Application, which we can
refer to as a seed device, then the user may choose to load data for an existing Facility from the seed device as a
**Classroom Server** or **Classroom Client** (more below). In order to do this, he must identify that he has
permission for the Facility for which he is trying to sync data through some scheme, perhaps by an OAuth-style
process (being sent to log into the Seed Device and verify permission to sync) or by entering a verification code.

Classroom Servers and Classroom Clients are two mutually exclusive modes in which a device can be configured,
exposing different options and workflows to the user. A Classroom Server is typically also the computer used by the
teacher, used for viewing coach reports and administering students, each of whom has a Classroom Client device.
#. A Classroom Server must eventually sync all user data for a Facility. A Classroom Server may additionally have one
or more Classroom Clients associated with it. On a Classroom Server, certain actions like account creation (via
"Sign up") may be disabled.
#. Classroom Clients initially aren't set up to sync any user data, , and are locked to a particular Classroom Server,
so that they can only sync data to and from that particular Classroom Server. When a student uses a tablet in the
classroom, she logs in with her account (the credentials are passed along to the classroom server), and her data
is synced over to the tablet from the Classroom Server. (See here for more exploration of this process).

Two additional (simpler) modes for a device could include:
* **Public Server**: For example, at a library. Anybody can sign up as a learner, and sync their own data to/from the
server if they have their own Private Device to connect to it.
* **Private Device**: Can freely sync data (as permitted through authentication) with any Public Server or other
Private Device (or the Central Server).

A **Classroom** (this name is chosen to distinguish from Python classes) is a collection of **Learners** and
**Coaches**. The Learners in a Classroom may be subdivided into **Learner Groups**. Learners and Coaches are both
**Roles** associated to a Class, which can be assigned to **Users**. A User may not be both a Learner and a Coach for
a single Class, but may be a Learner for one Classroom and a Coach for another Class. Classes and Learner Groups are
collectively referred to as **Collections**.

Users are further distinguished by their **data access permissions** (DAPs). Discrete pieces of data (like video and
exercise logs, or user attributes like passwords) may be associated to a User. Whether a requesting User has
permission to access another data User's data depends on their membership in Collections, and the Users' Roles in
the following ways (for example, but not limited to):
#. If the requesting User is also the data User, permission is granted.
#. If the requesting User is a Coach for a Classroom in which the data User is a Learner, then permission is granted.
(This is a simplification - but if data is also associated with a Classroom somehow, we may be able to use more
granular rules.)

Additionally, Users have **role permissions**. Users can assign or revoke Roles within a Classroom if they have that
Role. For instance a Coach for a Classroom may make another user a Coach, and a Facility Admin may make another user a
Facility Admin. This does not apply to the Learner Role - Coaches may make users Learners for a Class, but Learners
may not make other Users Learners.

**Facility Admin** is the final type of Role, characterized by the widest level of permissions. In general, a
Facility Admin always has permission for data within the Facility.

Device Owners and device permissions
------------------------------------
Actions not relating to user data as described above but specifically to a device, like upgrading Kolibri, changing
whether the device is a Classroom Server or Classroom Client, or determining manually which data should be synced must
be performed by a Device Owner.

While the person who created the Device Owner account may in general have root-level access to a device, and therefore
arbitrary access to user data in practice, the Device Owner does not have any data access permissions.

The hierarchy of Collections and Roles
--------------------------------------

Collections and Roles define a tree. The following diagram illustrates the relationship between Classrooms, Coaches,
Learner Groups, and Learners. The relationship between Facilities, Facility Admins, and Classrooms is analogous.

.. image:: /dev/img/ClassTree.png