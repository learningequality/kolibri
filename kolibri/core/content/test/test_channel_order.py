import uuid

from django.core.management import call_command
from django.test import TestCase
from django.utils import six

from kolibri.core.content import models as content


class ChannelOrderMixin(object):
    def _refresh_data(self, *args):
        for obj in args:
            obj.refresh_from_db()

    def setUp(self):
        self.out = six.StringIO()
        node = content.ContentNode.objects.create(
            id=uuid.uuid4(),
            title="test",
            content_id=uuid.uuid4(),
            channel_id=uuid.uuid4(),
        )
        self.c1 = content.ChannelMetadata.objects.create(
            id=uuid.uuid4().hex, name="c1", root=node, order=1
        )
        self.c2 = content.ChannelMetadata.objects.create(
            id=uuid.uuid4().hex, name="c2", root=node, order=2
        )
        self.c3 = content.ChannelMetadata.objects.create(
            id=uuid.uuid4().hex, name="c3", root=node, order=3
        )


class SetChannelPositionTestCase(ChannelOrderMixin, TestCase):
    """
    Testcase for setting channels position management command.
    """

    def set_channel_position(self, channel_id, position, out=None):
        call_command("setchannelposition", channel_id, position, stderr=out)

    def test_non_existent_channel(self):
        with self.assertRaises(SystemExit):
            self.set_channel_position(uuid.uuid4().hex, 1, out=self.out)
        self.assertIn("does not exist", self.out.getvalue())

    def test_position_out_of_range(self):
        with self.assertRaises(SystemExit):
            self.set_channel_position(
                self.c1.id, content.ChannelMetadata.objects.count() + 1, out=self.out
            )
        self.assertIn("Invalid position", self.out.getvalue())

    def test_change_order1(self):
        self.set_channel_position(self.c3.id, 1)
        self._refresh_data(self.c1, self.c2, self.c3)
        # expected order: c3, c1, c2
        self.assertEqual(self.c3.order, 1)
        self.assertEqual(self.c1.order, 2)
        self.assertEqual(self.c2.order, 3)

    def test_change_order2(self):
        self.set_channel_position(self.c3.id, 2)
        self._refresh_data(self.c1, self.c2, self.c3)
        # expected order: c1, c3, c2
        self.assertEqual(self.c1.order, 1)
        self.assertEqual(self.c3.order, 2)
        self.assertEqual(self.c2.order, 3)

    def test_change_order3(self):
        self.set_channel_position(self.c1.id, 3)
        self._refresh_data(self.c1, self.c2, self.c3)
        # expected order: c2, c3, c1
        self.assertEqual(self.c2.order, 1)
        self.assertEqual(self.c3.order, 2)
        self.assertEqual(self.c1.order, 3)

    def test_change_order4(self):
        self.set_channel_position(self.c1.id, 2)
        self._refresh_data(self.c1, self.c2, self.c3)
        # expected order: c2, c1, c3
        self.assertEqual(self.c2.order, 1)
        self.assertEqual(self.c1.order, 2)
        self.assertEqual(self.c3.order, 3)

    def test_change_order5(self):
        self.set_channel_position(self.c3.id, 1)
        self._refresh_data(self.c1, self.c2, self.c3)
        self.set_channel_position(self.c2.id, 2)
        self._refresh_data(self.c1, self.c2, self.c3)
        # expected order: c3, c2, c1
        self.assertEqual(self.c3.order, 1)
        self.assertEqual(self.c2.order, 2)
        self.assertEqual(self.c1.order, 3)

    def test_change_order6(self):
        self.set_channel_position(self.c3.id, 1)
        self._refresh_data(self.c1, self.c2, self.c3)
        self.set_channel_position(self.c1.id, 3)
        self._refresh_data(self.c1, self.c2, self.c3)
        self.set_channel_position(self.c1.id, 2)
        self._refresh_data(self.c1, self.c2, self.c3)
        self.set_channel_position(self.c2.id, 1)
        self._refresh_data(self.c1, self.c2, self.c3)
        self.set_channel_position(self.c3.id, 2)
        self._refresh_data(self.c1, self.c2, self.c3)
        self.set_channel_position(self.c1.id, 1)
        self._refresh_data(self.c1, self.c2, self.c3)
        # expected order: c1, c2, c3
        self.assertEqual(self.c1.order, 1)
        self.assertEqual(self.c2.order, 2)
        self.assertEqual(self.c3.order, 3)


class DeleteChannelReorderTestCase(ChannelOrderMixin, TestCase):
    """
    Testcase for pre-deletion signal on `ChannelMetadata`, which reorders channels.
    """

    def test_change_order1(self):
        self.c1.delete()
        self._refresh_data(self.c2, self.c3)
        # expected order: c2, c3
        self.assertEqual(self.c2.order, 1)
        self.assertEqual(self.c3.order, 2)

    def test_change_order2(self):
        self.c2.delete()
        self._refresh_data(self.c1, self.c3)
        # expected order: c1, c3
        self.assertEqual(self.c1.order, 1)
        self.assertEqual(self.c3.order, 2)

    def test_change_order3(self):
        self.c3.delete()
        self._refresh_data(self.c1, self.c2)
        # expected order: c1, c2
        self.assertEqual(self.c1.order, 1)
        self.assertEqual(self.c2.order, 2)
