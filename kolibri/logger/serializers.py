from kolibri.logger.models import AttemptLog, ContentRatingLog, ContentSessionLog, ContentSummaryLog, MasteryLog, UserSessionLog
from rest_framework import serializers


class ContentSessionLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContentSessionLog
        fields = ('pk', 'user', 'content_id', 'channel_id', 'start_timestamp',
                  'end_timestamp', 'time_spent', 'kind', 'extra_fields', 'progress')

class MasteryLogSerializer(serializers.ModelSerializer):

    pastattempts = serializers.SerializerMethodField()
    totalattempts = serializers.SerializerMethodField()

    class Meta:
        model = MasteryLog
        fields = ('id', 'summarylog', 'start_timestamp', 'pastattempts', 'totalattempts',
                  'end_timestamp', 'completion_timestamp', 'mastery_criterion', 'mastery_level', 'complete')

    def get_pastattempts(self, obj):
        # will return a list of the latest 10 correct and hint_taken fields for each attempt.
        return AttemptLog.objects.filter(masterylog__summarylog=obj.summarylog).values('correct', 'hinted').order_by('-start_timestamp')[:10]

    def get_totalattempts(self, obj):
        return AttemptLog.objects.filter(masterylog__summarylog=obj.summarylog).count()

class AttemptLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = AttemptLog
        fields = ('id', 'masterylog', 'start_timestamp', 'sessionlog',
                  'end_timestamp', 'completion_timestamp', 'item', 'time_spent',
                  'complete', 'correct', 'hinted', 'answer', 'simple_answer', 'interaction_history')


class ContentSummaryLogSerializer(serializers.ModelSerializer):

    currentmasterylog = serializers.SerializerMethodField()

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


class ContentRatingLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContentRatingLog
        fields = ('pk', 'user', 'content_id', 'channel_id', 'quality', 'ease', 'learning', 'feedback')


class UserSessionLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = UserSessionLog
        fields = ('pk', 'user', 'channels', 'start_timestamp', 'completion_timestamp', 'pages')
