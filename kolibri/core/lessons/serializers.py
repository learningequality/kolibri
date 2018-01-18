from rest_framework.serializers import ModelSerializer
from kolibri.auth.serializers import ClassroomSerializer
from .models import Lesson, LessonAssignment


class LessonAssignmentSerializer(ModelSerializer):
    """
    Returns a simplified serialization of the LessonAssignment model,
    containing only the assignee Collection, and omitting redundant info
    about the Lesson
    """
    class Meta:
        model = LessonAssignment
        fields = ('id', 'collection', 'assigned_by',)
        read_only_fields = ('assigned_by',)


class LessonSerializer(ModelSerializer):
    classroom = ClassroomSerializer(source='collection', read_only=True)
    assigned_groups = LessonAssignmentSerializer(many=True)

    class Meta:
        model = Lesson
        fields = (
            'id',
            'name',
            'description',
            'resources',
            'is_active',
            'collection',  # classroom
            'classroom',  # details about classroom
            'assigned_groups',
        )

    def create(self, validated_data):
        assignees = validated_data.pop('assigned_groups')
        user = self.context['request'].user
        new_lesson = Lesson.objects.create(created_by=user, **validated_data)

        # Create all of the new LessonAssignments
        for assignee in assignees:
            LessonAssignment.objects.create(
                assigned_by=user,
                lesson=new_lesson,
                collection=assignee['collection']
            )

        return new_lesson

    def update(self, validated_data):
        pass
