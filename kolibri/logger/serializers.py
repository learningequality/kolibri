from kolibri.logger.models import ContentInteractionLog, ContentRatingLog, ContentSummaryLog, UserSessionLog
from rest_framework import serializers


class ContentInteractionLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContentInteractionLog
        fields = ('pk', 'user', 'content_id', 'channel_id', 'start_timestamp',
                  'completion_timestamp', 'item_session', 'kind', 'extra_fields')


class ContentSummaryLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContentSummaryLog
        fields = ('pk', 'user', 'content_id', 'channel_id', 'start_timestamp',
                  'last_activity_timestamp', 'completion_timestamp', 'progress', 'kind', 'extra_fields')


class ContentRatingLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContentRatingLog
        fields = ('pk', 'user', 'content_id', 'channel_id', 'quality', 'ease', 'learning', 'feedback')


class UserSessionLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = UserSessionLog
        fields = ('pk', 'user', 'channels', 'start_timestamp', 'completion_timestamp', 'pages')
