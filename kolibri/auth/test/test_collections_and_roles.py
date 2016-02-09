from __future__ import absolute_import, print_function, unicode_literals

from django.test import TestCase

from kolibri.auth.models import FacilityUser, Facility, Classroom, LearnerGroup, FacilityAdmin, Coach, Learner, \
    Role, Collection, HierarchyNode


class CollectionRemovalTestCase(TestCase):
    """
    Tests that removing Roles and sub-Collections from a Collection does not create orhpans.
    """
    def setUp(self):
        user1, user2, user3 = self.user1, self.user2, self.user3 = (
            FacilityUser.objects.create(username='foo'),
            FacilityUser.objects.create(username='bar'),
            FacilityUser.objects.create(username='baz'),
        )
        self.lg = LearnerGroup.objects.create()
        self.lg.add_learner(user1)

        self.cr = Classroom.objects.create()
        self.cr.add_coach(user2)
        self.cr.add_learner_group(self.lg)

        self.f = Facility.objects.create()
        self.f.add_admin(user3)
        self.f.add_classroom(self.cr)

    def test_remove_learner(self):
        self.assertEqual(Learner.objects.count(), 1)
        self.lg.remove_learner(self.user1)
        self.assertEqual(Learner.objects.count(), 0)

    def test_remove_coach(self):
        self.assertEqual(Coach.objects.count(), 1)
        self.cr.remove_coach(self.user2)
        self.assertEqual(Coach.objects.count(), 0)

    def test_remove_admin(self):
        self.assertEqual(FacilityAdmin.objects.count(), 1)
        self.f.remove_admin(self.user3)
        self.assertEqual(FacilityAdmin.objects.count(), 0)

    def test_delete_learner_group(self):
        """ Deleting a LearnerGroup should delete its associated Learners as well """
        self.lg.delete()
        self.assertEqual(Learner.objects.count(), 0)

    def test_delete_classroom_pt1(self):
        """ Deleting a Classroom should delete its associated Learners """
        self.cr.delete()
        self.assertEqual(Learner.objects.count(), 0)

    def test_delete_classroom_pt2(self):
        """ Deleting a Classroom should delete its associated LearnerGroups """
        self.cr.delete()
        self.assertEqual(LearnerGroup.objects.count(), 0)

    def test_delete_classroom_pt3(self):
        """ Deleting a Classroom should delete its associated Coaches """
        self.cr.delete()
        self.assertEqual(Coach.objects.count(), 0)

    def test_delete_facility_pt1(self):
        """ Deleting a Facility should delete FacilityAdmins """
        self.f.delete()
        self.assertEqual(FacilityAdmin.objects.count(), 0)

    def test_delete_facility_pt2(self):
        """ Deleting a Facility should delete Classrooms """
        self.f.delete()
        self.assertEqual(Classroom.objects.count(), 0)

    def test_delete_facility_pt3(self):
        """ Deleting a Facility should delete *every* Collection and Role underneath it """
        self.f.delete()
        self.assertEqual(Collection.objects.count(), 0)
        self.assertEqual(Role.objects.count(), 0)


class CollectionRelatedObjectTestCase(TestCase):
    def setUp(self):
        users = self.users = [FacilityUser.objects.create(username="foo%s" % i) for i in range(0, 10)]
        self.lg = LearnerGroup.objects.create()
        self.lg.add_learners(users[0:5])

        self.cr = Classroom.objects.create()
        self.cr.add_coaches(users[5:8])
        self.cr.add_learner_group(self.lg)

        self.f = Facility.objects.create()
        self.f.add_admins(users[8:9])
        self.f.add_classroom(self.cr)

    def test_get_coaches(self):
        self.assertSetEqual(set(c.pk for c in Coach.objects.filter(user__in=self.users[5:8])),
                            set(c.pk for c in self.cr.coaches()))

    def test_get_learner_groups(self):
        self.assertSetEqual({self.lg.pk}, set(lg.pk for lg in self.cr.learner_groups()))

    def test_get_classroom(self):
        self.assertEqual(self.cr.pk, self.lg.classroom().pk)


class CollectionsTestCase(TestCase):
    def test_add_admin(self):
        user = FacilityUser.objects.create(username='foo')
        facility = Facility.objects.create()
        facility.add_admin(user)
        self.assertEqual(FacilityAdmin.objects.filter(user=user).count(), 1)

    def test_add_classroom(self):
        facility = Facility.objects.create()
        facility.add_classroom(Classroom.objects.create())
        self.assertEqual(Classroom.objects.count(), 1)

    def test_add_coach(self):
        user = FacilityUser.objects.create(username='foo')
        classroom = Classroom.objects.create()
        classroom.add_coach(user)
        self.assertEqual(Coach.objects.filter(user=user).count(), 1)

    def test_add_learner_group(self):
        classroom = Classroom.objects.create()
        classroom.add_learner_group(LearnerGroup.objects.create())
        self.assertEqual(LearnerGroup.objects.count(), 1)

    def test_learner(self):
        user = FacilityUser.objects.create(username='foo')
        learner_group = LearnerGroup.objects.create()
        learner_group.add_learner(user)
        self.assertEqual(Learner.objects.filter(user=user).count(), 1)


class HierarchyNodeSanityTestCase(TestCase):
    """
    Makes assertions about HierarchyNode -- since this class should be considered an implementation detail
    we separate these tests from the rest.
    """
    def setUp(self):
        self.user = FacilityUser.objects.create(username='mike')

    def test_hierarchy_nodes_created_for_role(self):
        from kolibri.auth.models import HierarchyNode
        self.assertEqual(HierarchyNode.objects.count(), 0)
        Role.objects.create(user=self.user, kind='Coach')
        self.assertEqual(HierarchyNode.objects.count(), 1)

    def test_hierarchy_nodes_not_orphaned_when_role_deleted(self):
        from kolibri.auth.models import HierarchyNode
        role = Role.objects.create(user=self.user, kind='Coach')
        self.assertEqual(HierarchyNode.objects.count(), 1)
        role.delete()
        self.assertEqual(HierarchyNode.objects.count(), 0)

    def test_hierarchy_nodes_created_for_collection(self):
        from kolibri.auth.models import HierarchyNode
        self.assertEqual(HierarchyNode.objects.count(), 0)
        Collection.objects.create(kind='Facility')
        self.assertEqual(HierarchyNode.objects.count(), 1)

    def test_hierarchy_nodes_not_orphaned_when_collection_deleted(self):
        from kolibri.auth.models import HierarchyNode
        coll = Collection.objects.create(kind='Facility')
        self.assertEqual(HierarchyNode.objects.count(), 1)
        coll.delete()
        self.assertEqual(HierarchyNode.objects.count(), 0)


class HierarchyNodeStructureTestCase(TestCase):
    """
    The test case uses the following tree:
    Parent        |  Children
    --------------|--------------------------------------------
    Collection 0  |  Role 0, Role 1, Collection 1, Collection 2
    Collection 1  |  Role 2, Role 3
    Collection 2  |  Role 4
    """
    def setUp(self):
        collections = self.collections = [HierarchyNode.objects.create(kind='Collection') for _ in range(0, 3)]
        roles = self.roles = [HierarchyNode.objects.create(kind='Role') for _ in range(0, 5)]
        roles[0].parent = roles[1].parent = collections[1].parent = collections[2].parent = collections[0]
        roles[2].parent = roles[3].parent = collections[1]
        roles[4].parent = collections[2]
        for n in roles + collections:
            n.save()

    def test_assert_setup_sanity(self):
        self.assertEqual(self.collections[0].children.count(), 4)
        self.assertEqual(self.collections[0].get_descendants().count(), 7)
        self.assertEqual(HierarchyNode.objects.all().count(), 8)
        self.assertEqual(HierarchyNode.objects.filter(kind='Role').count(), 5)
        self.assertEqual(HierarchyNode.objects.filter(kind='Collection').count(), 3)

    def test_insert_collection_node(self):
        tracer_node = HierarchyNode.objects.create(kind='Tracer')
        self.collections[0].insert_collection_node(tracer_node)
        self.assertEqual(self.collections[0].children.filter(kind='Tracer').count(), 1)

    def test_insert_role_node(self):
        tracer_node = HierarchyNode.objects.create(kind='Tracer')
        self.collections[0].insert_role_node(tracer_node)
        self.assertEqual(self.collections[0].children.filter(kind='Tracer').count(), 1)
