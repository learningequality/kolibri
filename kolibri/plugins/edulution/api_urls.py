from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .viewsets import KnowledgeMapViewset

router = routers.SimpleRouter()
router.register(r'knowledgemap', KnowledgeMapViewset, base_name='knowledgemap')

urlpatterns = [
    url(r'^', include(router.urls)),
]
