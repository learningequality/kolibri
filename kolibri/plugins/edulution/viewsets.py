from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.response import Response
from kolibri.core.content.models import ContentNode
from kolibri.core.content.api import ContentNodeProgressViewset
from kolibri.core.content.serializers import ContentNodeSlimSerializer


class KnowledgeMapViewset(ReadOnlyModelViewSet):
    def retrieve(self, request, pk=None):
        def get_progress(node):
            serializer = ContentNodeProgressViewset.serializer_class(node)
            serializer.context['request'] = request
            return serializer.data['progress_fraction']

        def get_progress_by_id(id):
            nodes = ContentNode.objects.filter(id=id)
            return 0.0 if len(nodes) == 0 else get_progress(nodes[0])

        def filter_pending(prereqs):
            return filter(lambda p: p['progress'] < 1.0, prereqs)

        def info(nodes):
            return map(lambda n: {'title': n.title,
                                  'content_id': n.content_id,
                                  'progress': get_progress(n),
                                  'id': n.id}, nodes)

        def get_children(parent_id):
            children = ContentNode.objects.filter(parent=parent_id, available=True)
            serialized = ContentNodeSlimSerializer(children, many=True).data
            for c, s in zip(children, serialized):
                s['progress_fraction'] = get_progress(c)
                s['pendingPrerequisites'] = filter_pending(info(c.has_prerequisite.all()))
            return serialized

        children = get_children(pk)
        for child in children:
            grand_children = get_children(child['id'])
            child['children'] = grand_children
        return Response({'results': children, 'progress': get_progress_by_id(pk)})
