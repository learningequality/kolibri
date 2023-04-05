from abc import abstractmethod

from kolibri.plugins.hooks import define_hook
from kolibri.plugins.hooks import KolibriHook


@define_hook
class StorageHook(KolibriHook):
    @abstractmethod
    def schedule(self, job, orm_job):
        pass

    @abstractmethod
    def update(self, job, orm_job, state=None, **kwargs):
        pass

    @abstractmethod
    def clear(self, job, orm_job):
        pass
