from django.conf.urls import url
from django.http import HttpResponse
from rest_framework import routers

import csv
import time
import os

from kolibri.utils import conf
from .api import AttemptLogViewSet
from .api import ContentSessionLogViewSet
from .api import ContentSummaryLogViewSet
from .api import ExamAttemptLogViewSet
from .api import ExamLogViewSet
from .api import MasteryLogViewSet
from .api import TotalContentProgressViewSet
from .api import UserSessionLogViewSet
from .k_csv import download_csv_file
from .k_csv import exported_logs_info
router = routers.SimpleRouter()

router.register(r'contentsessionlog', ContentSessionLogViewSet, base_name='contentsessionlog')
router.register(r'contentsummarylog', ContentSummaryLogViewSet, base_name='contentsummarylog')
router.register(r'usersessionlog', UserSessionLogViewSet, base_name='usersessionlog')
router.register(r'masterylog', MasteryLogViewSet, base_name='masterylog')
router.register(r'attemptlog', AttemptLogViewSet, base_name='attemptlog')
router.register(r'examlog', ExamLogViewSet, base_name='examlog')
router.register(r'examattemptlog', ExamAttemptLogViewSet, base_name='examattemptlog')
router.register(r'userprogress', TotalContentProgressViewSet, base_name='userprogress')

router.urls.append(url(r'^downloadcsvfile/(?P<log_type>.*)/$',
                       download_csv_file, name='download_csv_file'))

router.urls.append(url(r'^exportedlogsinfo/$',
                       exported_logs_info, name='exportedlogsinfo'))


def panic(request):

    outputFile = os.path.join(conf.KOLIBRI_HOME, 'panic.csv')
    if not os.path.exists(outputFile):
        with open(outputFile, 'w') as f:
            f.write('Server time, Username, User ID, Channel ID, Content ID, Content Node ID, Question ID\n')

    with open(outputFile, 'a') as f:
        writer = csv.writer(f)
        writer.writerow([
            time.time(),
            request.user.username,
            request.user.id,
            request.POST.get('channel_id'),
            request.POST.get('content_id'),
            request.POST.get('node_id'),
            request.POST.get('question_id'),
        ])
    return HttpResponse("ok")


router.urls.append(url(r'^panic/$', panic, name='panic'))

urlpatterns = router.urls
