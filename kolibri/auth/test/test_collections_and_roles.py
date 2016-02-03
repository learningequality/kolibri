from django.test import TestCase

from kolibri.auth import get_user_models, get_hierarchy_models


class HierarchyNodeSanityTestCase(TestCase):
    """
    Makes assertions about HierarchyNode -- since this class should be considered an implementation detail
    we separate these tests from the rest.
    """
    def setUp(self):
        self.Role, self.Collection = get_hierarchy_models()
        BaseUser, FacilityUser, DeviceOwner = get_user_models()
        self.user = FacilityUser.objects.create(username='mike')

    def test_hierarchy_nodes_created_for_role(self):
        from kolibri.auth.models import HierarchyNode
        self.assertEqual(HierarchyNode.objects.count(), 0)
        self.Role.objects.create(user=self.user, kind='Coach')
        self.assertEqual(HierarchyNode.objects.count(), 1)

    def test_hierarchy_nodes_not_orphaned_when_role_deleted(self):
        from kolibri.auth.models import HierarchyNode
        role = self.Role.objects.create(user=self.user, kind='Coach')
        self.assertEqual(HierarchyNode.objects.count(), 1)
        role.delete()
        self.assertEqual(HierarchyNode.objects.count(), 0)

    def test_hierarchy_nodes_created_for_collection(self):
        from kolibri.auth.models import HierarchyNode
        self.assertEqual(HierarchyNode.objects.count(), 0)
        self.Collection.objects.create(kind='Facility')
        self.assertEqual(HierarchyNode.objects.count(), 1)

    def test_hierarchy_nodes_not_orphaned_when_collection_deleted(self):
        from kolibri.auth.models import HierarchyNode
        coll = self.Collection.objects.create(kind='Facility')
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
        from kolibri.auth.models import HierarchyNode
        collections = self.collections = [HierarchyNode.objects.create(kind='Collection') for _ in range(0, 3)]
        roles = self.roles = [HierarchyNode.objects.create(kind='Role') for _ in range(0, 5)]
        roles[0].parent = roles[1].parent = collections[1].parent = collections[2].parent = collections[0]
        roles[2].parent = roles[3].parent = collections[1]
        roles[4].parent = collections[2]
        for n in roles + collections:
            n.save()

    def test_assert_setup_sanity(self):
        from kolibri.auth.models import HierarchyNode
        self.assertEqual(self.collections[0].children.count(), 4)
        self.assertEqual(self.collections[0].get_descendants().count(), 7)
        self.assertEqual(HierarchyNode.objects.all().count(), 8)
        self.assertEqual(HierarchyNode.objects.filter(kind='Role').count(), 5)
        self.assertEqual(HierarchyNode.objects.filter(kind='Collection').count(), 3)

    def test_insert_collection_node(self):
        from kolibri.auth.models import HierarchyNode
        tracer_node = HierarchyNode.objects.create(kind='Tracer')
        self.collections[0].insert_collection_node(tracer_node)
        self.assertEqual(self.collections[0].children.filter(kind='Tracer').count(), 1)

    def test_insert_role_node(self):
        from kolibri.auth.models import HierarchyNode
        tracer_node = HierarchyNode.objects.create(kind='Tracer')
        self.collections[0].insert_role_node(tracer_node)
        self.assertEqual(self.collections[0].children.filter(kind='Tracer').count(), 1)
