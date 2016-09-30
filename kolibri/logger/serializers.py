from kolibri.logger.models import AttemptLog, ContentRatingLog, ContentSessionLog, ContentSummaryLog, MasteryLog, UserSessionLog
from rest_framework import serializers


class ContentSessionLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContentSessionLog
        fields = ('pk', 'user', 'content_id', 'channel_id', 'start_timestamp',
                  'end_timestamp', 'time_spent', 'kind', 'extra_fields', 'progress')

class MasteryLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = MasteryLog
        fields = ('pk', 'summarylog', 'start_timestamp',
                  'end_timestamp', 'completion_timestamp', 'mastery_criterion', 'mastery_level', 'complete')

class AttemptLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = AttemptLog
        fields = ('pk', 'masterylog', 'start_timestamp',
                  'end_timestamp', 'completion_timestamp', 'item', 'time_spent',
                  'complete', 'correct', 'answer', 'simple_answer', 'interaction_history')

class NestedMasteryLogSerializer(MasteryLogSerializer):

    currentattemptlog = serializers.SerializerMethodField()
    responsehistory = serializers.SerializerMethodField()

    class Meta(MasteryLogSerializer.Meta):
        fields = MasteryLogSerializer.Meta.fields + ('currentattemptlog', 'responsehistory')

    def get_currentattemptlog(self, obj):
        try:
            current_log = obj.attemptlogs.filter(complete=False).latest('end_timestamp')
            return AttemptLogSerializer(current_log).data
        except AttemptLog.DoesNotExist:
            return None

    def get_responsehistory(self, obj):
        try:
            logs = obj.attemptlogs.order_by('completion_timestamp').values('correct')
            return logs
        except AttemptLog.DoesNotExist:
            return []

class ContentSummaryLogSerializer(serializers.ModelSerializer):

    currentmasterylog = serializers.SerializerMethodField()

    class Meta:
        model = ContentSummaryLog
        fields = ('pk', 'user', 'content_id', 'channel_id', 'start_timestamp', 'currentmasterylog',
                  'end_timestamp', 'completion_timestamp', 'time_spent', 'progress', 'kind', 'extra_fields')

    def get_currentmasterylog(self, obj):
        try:
            current_log = obj.masterylogs.filter(complete=False).latest('end_timestamp')
            return NestedMasteryLogSerializer(current_log).data
        except MasteryLog.DoesNotExist:
            return None


class ContentRatingLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContentRatingLog
        fields = ('pk', 'user', 'content_id', 'channel_id', 'quality', 'ease', 'learning', 'feedback')


class UserSessionLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = UserSessionLog
        fields = ('pk', 'user', 'channels', 'start_timestamp', 'completion_timestamp', 'pages')
