from kolibri.logger.models import AttemptLog, ContentRatingLog, ContentSessionLog, ContentSummaryLog, MasteryLog, UserSessionLog
from rest_framework import serializers


class ContentSessionLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContentSessionLog
        fields = ('pk', 'user', 'content_id', 'channel_id', 'start_timestamp',
                  'end_timestamp', 'time_spent', 'kind', 'extra_fields', 'progress')


class ContentSummaryLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContentSummaryLog
        fields = ('pk', 'user', 'content_id', 'channel_id', 'start_timestamp',
                  'end_timestamp', 'completion_timestamp', 'time_spent', 'progress', 'kind', 'extra_fields')


class ContentRatingLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContentRatingLog
        fields = ('pk', 'user', 'content_id', 'channel_id', 'quality', 'ease', 'learning', 'feedback')


class UserSessionLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = UserSessionLog
        fields = ('pk', 'user', 'channels', 'start_timestamp', 'completion_timestamp', 'pages')

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
