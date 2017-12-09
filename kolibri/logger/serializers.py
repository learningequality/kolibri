from django.db.models import Sum
from django.utils.timezone import now
from kolibri.auth.models import FacilityUser
from kolibri.core.serializers import KolibriModelSerializer
from kolibri.logger.models import AttemptLog, ContentSessionLog, ContentSummaryLog, ExamAttemptLog, ExamLog, MasteryLog, UserSessionLog
from rest_framework import serializers


class ContentSessionLogSerializer(KolibriModelSerializer):

    extra_fields = serializers.JSONField(default='{}')

    class Meta:
        model = ContentSessionLog
        fields = ('pk', 'user', 'content_id', 'channel_id', 'start_timestamp',
                  'end_timestamp', 'time_spent', 'kind', 'extra_fields', 'progress')

class ExamLogSerializer(KolibriModelSerializer):
    progress = serializers.SerializerMethodField()
    score = serializers.SerializerMethodField()

    def get_progress(self, obj):
        return obj.attemptlogs.count()

    def get_score(self, obj):
        return obj.attemptlogs.aggregate(Sum('correct')).get('correct__sum')

    class Meta:
        model = ExamLog
        fields = ('id', 'exam', 'user', 'closed', 'progress', 'score', 'completion_timestamp')
        read_only_fields = ('completion_timestamp', )

    def update(self, instance, validated_data):
        # This has changed, set the completion timestamp
        if validated_data.get('closed') and not instance.closed:
            instance.completion_timestamp = now()
        return super(ExamLogSerializer, self).update(instance, validated_data)

class MasteryLogSerializer(KolibriModelSerializer):

    pastattempts = serializers.SerializerMethodField()
    totalattempts = serializers.SerializerMethodField()
    mastery_criterion = serializers.JSONField(default='{}')

    class Meta:
        model = MasteryLog
        fields = ('id', 'summarylog', 'start_timestamp', 'pastattempts', 'totalattempts', 'user',
                  'end_timestamp', 'completion_timestamp', 'mastery_criterion', 'mastery_level', 'complete')

    def get_pastattempts(self, obj):
        # will return a list of the latest 10 correct and hint_taken fields for each attempt.
        return AttemptLog.objects.filter(masterylog__summarylog=obj.summarylog).values('correct', 'hinted').order_by('-start_timestamp')[:10]

    def get_totalattempts(self, obj):
        return AttemptLog.objects.filter(masterylog__summarylog=obj.summarylog).count()

class AttemptLogSerializer(KolibriModelSerializer):
    answer = serializers.JSONField(default='{}')
    interaction_history = serializers.JSONField(default='[]')

    class Meta:
        model = AttemptLog
        fields = ('id', 'masterylog', 'start_timestamp', 'sessionlog',
                  'end_timestamp', 'completion_timestamp', 'item', 'time_spent', 'user',
                  'complete', 'correct', 'hinted', 'answer', 'simple_answer', 'interaction_history')

class ExamAttemptLogSerializer(KolibriModelSerializer):
    answer = serializers.JSONField(default='{}', allow_null=True)
    interaction_history = serializers.JSONField(default='[]')

    class Meta:
        model = ExamAttemptLog
        fields = ('id', 'examlog', 'start_timestamp', 'channel_id', 'content_id',
                  'end_timestamp', 'completion_timestamp', 'item', 'time_spent', 'user',
                  'complete', 'correct', 'hinted', 'answer', 'simple_answer', 'interaction_history')

    def validate(self, data):
        # Only do this validation when both are being set
        # not necessary on PATCH, for example
        if data.get('examlog') and data.get('user'):
            try:
                if data['examlog'].user != data['user']:
                    raise serializers.ValidationError('User field and user for related exam log are not the same')
            except ExamLog.DoesNotExist:
                raise serializers.ValidationError('Invalid exam log')
        return data

class ContentSummaryLogSerializer(KolibriModelSerializer):

    currentmasterylog = serializers.SerializerMethodField()
    extra_fields = serializers.JSONField(default='{}')

    class Meta:
        model = ContentSummaryLog
        fields = ('pk', 'user', 'content_id', 'channel_id', 'start_timestamp', 'currentmasterylog',
                  'end_timestamp', 'completion_timestamp', 'time_spent', 'progress', 'kind', 'extra_fields')

    def get_currentmasterylog(self, obj):
        try:
            current_log = obj.masterylogs.latest('end_timestamp')
            return MasteryLogSerializer(current_log).data
        except MasteryLog.DoesNotExist:
            return None

class UserSessionLogSerializer(KolibriModelSerializer):

    class Meta:
        model = UserSessionLog
        fields = ('pk', 'user', 'channels', 'start_timestamp', 'last_interaction_timestamp', 'pages')

class TotalContentProgressSerializer(serializers.ModelSerializer):

    progress = serializers.SerializerMethodField()

    class Meta:
        model = FacilityUser
        fields = ('progress', 'id')

    def get_progress(self, obj):
        return obj.contentsummarylog_set.filter(progress=1).aggregate(Sum('progress')).get('progress__sum')
