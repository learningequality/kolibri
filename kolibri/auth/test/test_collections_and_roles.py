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

    def test_insert_child(self):
        from kolibri.auth.models import HierarchyNode
        node1, node2 = HierarchyNode.objects.create(), HierarchyNode.objects.create()
        node1.insert_child(node2)
        self.assertEqual(
            HierarchyNode.objects.get(id=node1.id).get_children().first(),
            HierarchyNode.objects.get(id=node2.id)
        )

    def test_insert_collection_node_part_1(self):
        """
        Inserting a collection node when the parent has *no* children.
        """
        from kolibri.auth.models import HierarchyNode
        node1, node2 = HierarchyNode.objects.create(), HierarchyNode.objects.create()
        node1.insert_collection_node(node2)
        self.assertEqual(
            HierarchyNode.objects.get(id=node1.id).get_children().first(),
            HierarchyNode.objects.get(id=node2.id)
        )

    def test_insert_collection_node_part_2(self):
        """
        Inserting a collection node when the parent has a Role child only.
        """
        from kolibri.auth.models import HierarchyNode
        coll1, coll2, role = (HierarchyNode.objects.create(), HierarchyNode.objects.create(),
                              HierarchyNode.objects.create())
        coll1.insert_role_node(role)
        coll1.insert_collection_node(coll2)
        self.assertEqual(coll1, role.parent)
        self.assertEqual(role, coll2.parent)


class HierarchyNodeStructureTestCase(TestCase):
    """
    The fixture hierarchy.json defines the following tree
    Collection -> Role -> Role ->
      -> Collection       ->      Collection
           |    |                     |
        Role   Role                 Role
    """
    fixtures = ['hierarchy.json']

    def setUp(self):
        from kolibri.auth.models import HierarchyNode
        self.classroom_node = HierarchyNode.objects.get(pk=1)  # This is the root node in the fixture

    def test_assert_fixture_sanity(self):
        from kolibri.auth.models import HierarchyNode
        self.assertEqual(HierarchyNode.objects.count(), 8)
        self.assertEqual(HierarchyNode.objects.filter(parent=None).count(), 1)
        self.assertEqual(HierarchyNode.objects.filter(kind='Collection').count(), 3)
        self.assertEqual(HierarchyNode.objects.filter(kind='Role').count(), 5)

    def test_insert_collection_node_part_1(self):
        """
        Tests that when we insert a Collection node, it occurs *after* Role nodes.
        """
        from kolibri.auth.models import HierarchyNode
        tracer_node = HierarchyNode.objects.create(kind='Tracer')
        self.classroom_node.insert_collection_node(tracer_node)
        role1 = self.classroom_node.get_children().first()
        role2 = role1.get_children().first()
        self.assertEqual(role1.kind, 'Role')
        self.assertEqual(role2.kind, 'Role')
        self.assertEqual(role2.get_descendants().filter(kind='Tracer').count(), 1)

    def test_insert_collection_node_part_2(self):
        """
        Tests that when we insert a Collection node, its parent is another Collection node or Role node.
        """
        from kolibri.auth.models import HierarchyNode
        tracer_node = HierarchyNode.objects.create(kind='Tracer')
        self.classroom_node.insert_collection_node(tracer_node)
        # There are 3 possible parent ids because it doesn't really matter in what order the subcollections is
        # inserted, as long as it occurs *after* role nodes.
        last_role = self.classroom_node.get_descendants().filter(kind='Role').last()
        subcollections = self.classroom_node.get_descendants().filter(kind='Collection')
        possible_parent_ids = [s.id for s in subcollections] + [last_role.id]
        self.assertIn(HierarchyNode.objects.get(kind='Tracer').parent.id, possible_parent_ids)

    def test_insert_role_node_part_1(self):
        """
        Test that when we insert a Role node, it occurs *before* Collection nodes.
        """
        from kolibri.auth.models import HierarchyNode
        tracer_node = HierarchyNode.objects.create(kind='Tracer')
        self.classroom_node.insert_role_node(tracer_node)
        assertions = [n.id == self.classroom_node.id or n.kind == 'Role'
                      for n in HierarchyNode.objects.get(kind='Tracer').get_ancestors()]
        self.assertNotEqual(assertions, [])  # all([]) is vacuously true, so guard against it.
        self.assertTrue(all(assertions))

    def test_insert_role_node_part_2(self):
        """
        Test that when we insert a Role node, it has the same Collection children that we started with.
        """
        expected = [n.id for n in self.classroom_node.get_descendants().filter(kind='Collection')]
        from kolibri.auth.models import HierarchyNode
        tracer_node = HierarchyNode.objects.create(kind='Tracer')
        self.classroom_node.insert_role_node(tracer_node)
        tracer_node = HierarchyNode.objects.get(kind='Tracer')  # Get a new reference so related objects are updated
        actual = [n.id for n in tracer_node.get_descendants().filter(kind='Collection')]
        self.assertSetEqual(set(expected), set(actual))
