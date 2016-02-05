Permissions
===========

Permissions are divided into data access permissions (DAPs) and device permissions. Permissions are checked on a user
object using the default django.contrib.auth has_perm user-model methods, which take a permission string and an
optional object for row-level permissions.

Objects which foreign key onto users (a.k.a User-related objects) can, in a limited way, define row-level permissions.
In reality, these permissions aren't decided row-by-row for efficiency, but instead define the following class method
to return an iterable of objects for which a requesting user has permissions given the related user:

.. py:classmethod:: permitted_objects(cls, perm, req_user)

    For the given Model class, this class method returns an iterable of objects for which the requesting user
    (req_user) has the given permission.

    :param perm: The permission string being tested, for example 'auth.add_coach'
    :param req_user: The user for which permissions are requested.
    :return: An iterable of permitted objects, for example Classroom.permitted_objects('auth.add_coach', user) will
        return an iterable of Classroom objects for which user has the 'auth.add_coach' permission.

For row-level permissions on User-related objects, the authentication backends can defer to this Model class method.

Device permissions
------------------

Device permissions govern who can perform certain actions on a device, and are characterized by the device type, which
is decided at installation time but could be subsequently modified.
See more `in our google docs <https://docs.google.com/document/d/14YZah9u9wgah6Cu3M3IF5u0_GSeie21VYtYVFTYBYtA/edit>`_.

Data access permissions
-----------------------
Data access permissions include both who can read/write User-related objects on a per-object basis, as well as
assigning/revoking roles from User. The following permissions exist in Kolibri:

============================================================================  =======================================================================  =========================================================================================
Permissions                                                                   Permitted optional object type (or "None" for the universal permission)  Governing rule
============================================================================  =======================================================================  =========================================================================================
auth.add_coach, auth.remove_coach                                             None                                                                     True for FacilityAdmins only.
auth.add_coach, auth.remove_coach                                             Classroom                                                                True for FacilityAdmins or Coaches for the Classroom.
auth.add_learner, auth.remove_learner                                         None                                                                     True for FacilityAdmins or Coaches for the LearnerGroup.
auth.add_learner, auth.remove_learner                                         Learner Group                                                            True for FacilityAdmins or Coaches for the LearnerGroup.
auth.add_facility_admin, auth.remove_facility_admin                           None                                                                     True if requesting user is a Facility Admin only.
auth.add_facility, auth.remove_facility                                       None                                                                     Always False for FacilityUsers
auth.change_facility                                                          None                                                                     Only True for FacilityAdmins
auth.add_classroom, auth.remove_classroom, auth.change_classroom              None                                                                     Only universally True for FacilityAdmins. add_classroom rejects optional objects.
auth.change_classroom, auth.remove_classroom                                  Classroom                                                                True for FacilityAdmins and True for Coaches if they are a Coach for the given Classroom.
auth.add_learner_group, auth.remove_learner_group, auth.change_learner_group  None                                                                     Only universally True for FacilityAdmins.
auth.add_learner_group                                                        Classroom                                                                True for FacilityAdmins or for a Coach of the Classroom.
auth.remove_learner_group, auth.change_learner_group                          LearnerGroup                                                             True for FacilityAdmins or Coaches for the LearnerGroup.
============================================================================  =======================================================================  =========================================================================================

Format of permission strings
----------------------------

Permission strings should be namepspaced with an ``app`` label. For instance when creating new add/change/remove
permissions for a new ``FooBar`` object in the ``Baz`` app, use the following names::

    Baz.add_foo_bar
    Baz.change_foo_bar
    Baz.remove_foo_bar

Permission names are not limited to add/change/remove -- they're only limited by your imagination! For instance, they
could govern actions like ``Baz.can_sync_foo_bars``.

Implementation details of permissions strings
---------------------------------------------

The ``FacilityBackend`` class is responsible for checking permissions. It uses a dictionary of
permission string-callable pairs to decide. The callables should have the signature ``(user, obj=None)``.
For example::

  _permissions_checkers = {
    ...
    'auth.change_classroom': _coach_for_the_class,
    ...
  }

  def _coach_for_the_class(user, obj):
    """
    Permission formula for auth.change_classroom and auth.remove_classroom

    :param user: A FacilityUser object
    :param obj: The optional permissions object. Raises an InvalidPermission error if obj is not a Classroom.
    :return: True if the user is a Coach for the Classroom obj & True if the user is a FacilityAdmin, otherwise False
    """
    if obj is not None and _assert_type(obj, Classroom):
        return user.is_facility_admin() or (user in [role.user for role in obj.coaches()])
    else:
        return user.is_facility_admin()
