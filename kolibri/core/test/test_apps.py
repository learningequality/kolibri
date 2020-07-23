import functools

import mock
from django.test.testcases import TestCase
from redis import Redis

from kolibri.core.apps import KolibriCoreConfig
from kolibri.core.apps import RedisSettingsHelper

DEFAULT_CACHE_OPTS = dict(
    CACHE_BACKEND="redis",
    CACHE_REDIS_MAXMEMORY=123,
    CACHE_REDIS_MAXMEMORY_POLICY="allkeys-lru",
)


def do_setup(**cache_opts):
    defaults = DEFAULT_CACHE_OPTS.copy()
    defaults.update(cache_opts)
    all_opts = dict(Cache=defaults)

    def outer_decorator(func):
        @functools.wraps(func)
        def wrapped(self, mock_cache, mock_options, mock_helper_cls, mock_logger):
            mock_cache.get_master_client.return_value = self.client
            mock_options.__getitem__.side_effect = all_opts.__getitem__
            mock_helper_cls.return_value = self.helper
            result = func(self, mock_logger)
            if not result:
                mock_cache.get_master_client.assert_called_once()
                mock_helper_cls.assert_called_once_with(self.client)

        return wrapped

    return outer_decorator


@mock.patch("kolibri.core.apps.logger")
@mock.patch("kolibri.core.apps.RedisSettingsHelper")
@mock.patch("kolibri.core.apps.OPTIONS")
@mock.patch("kolibri.core.apps.process_cache")
class KolibriCoreConfigTestCase(TestCase):
    def setUp(self):
        super(KolibriCoreConfigTestCase, self).setUp()
        self.client = mock.MagicMock(spec=Redis)
        self.helper = mock.MagicMock(spec=RedisSettingsHelper)

    def setUp_okay(self):
        self.helper.get_maxmemory.return_value = 123
        self.helper.get_maxmemory_policy.return_value = "allkeys-lru"

    def assertOkay(self, logger):
        KolibriCoreConfig.check_redis_settings()

        self.helper.get_maxmemory.assert_called_once()
        self.helper.set_maxmemory.assert_not_called()

        self.helper.get_maxmemory_policy.assert_called_once()
        self.helper.set_maxmemory_policy.assert_not_called()

        logger.assert_not_called()

    @do_setup(CACHE_BACKEND="magic")
    def test_check_redis_settings__not_redis(self, logger):
        KolibriCoreConfig.check_redis_settings()
        self.helper.get_maxmemory.assert_not_called()
        self.helper.set_maxmemory.assert_not_called()

        self.helper.get_maxmemory_policy.assert_not_called()
        self.helper.set_maxmemory_policy.assert_not_called()

        self.helper.save.assert_not_called()
        logger.assert_not_called()
        return True

    @do_setup()
    def test_check_redis_settings(self, logger):
        self.setUp_okay()
        self.assertOkay(logger)
        self.helper.save.assert_not_called()

    @do_setup(CACHE_REDIS_MAXMEMORY=0)
    def test_check_redis_settings__not_okay__maxmemory(self, logger):
        self.helper.get_maxmemory.return_value = 0
        self.helper.get_maxmemory_policy.return_value = "allkeys-lru"
        KolibriCoreConfig.check_redis_settings()

        self.helper.get_maxmemory.assert_called_once()
        self.helper.set_maxmemory.assert_not_called()

        self.helper.get_maxmemory_policy.assert_called_once()
        self.helper.set_maxmemory_policy.assert_not_called()

        self.helper.save.assert_not_called()
        logger.warning.assert_called()

    @do_setup(CACHE_REDIS_MAXMEMORY_POLICY="")
    def test_check_redis_settings__not_okay__maxmemory_policy(self, logger):
        self.helper.get_maxmemory.return_value = 123
        self.helper.get_maxmemory_policy.return_value = "noeviction"
        KolibriCoreConfig.check_redis_settings()

        self.helper.get_maxmemory.assert_called_once()
        self.helper.set_maxmemory.assert_not_called()

        self.helper.get_maxmemory_policy.assert_called_once()
        self.helper.set_maxmemory_policy.assert_not_called()

        self.helper.save.assert_not_called()
        logger.warning.assert_called()

    @do_setup(CACHE_REDIS_MAXMEMORY=456)
    def test_check_redis_settings__update__maxmemory(self, logger):
        self.helper.get_maxmemory.return_value = 0
        self.helper.get_maxmemory_policy.return_value = "allkeys-lru"
        self.helper.get_used_memory.return_value = 0
        self.helper.changed = True
        KolibriCoreConfig.check_redis_settings()

        self.helper.get_maxmemory.assert_called_once()
        self.helper.set_maxmemory.assert_called_once_with(456)

        self.helper.get_maxmemory_policy.assert_called_once()
        self.helper.set_maxmemory_policy.assert_not_called()

        self.helper.save.assert_not_called()
        logger.warning.assert_not_called()

    @do_setup(CACHE_REDIS_MAXMEMORY=456)
    def test_check_redis_settings__update__maxmemory__warning(self, logger):
        self.helper.get_maxmemory.return_value = 0
        self.helper.get_maxmemory_policy.return_value = "allkeys-lru"
        self.helper.get_used_memory.return_value = 512
        self.helper.changed = True
        KolibriCoreConfig.check_redis_settings()

        self.helper.get_maxmemory.assert_called_once()
        self.helper.set_maxmemory.assert_called_once_with(456)

        self.helper.get_maxmemory_policy.assert_called_once()
        self.helper.set_maxmemory_policy.assert_not_called()

        self.helper.save.assert_not_called()
        logger.warning.assert_called()

    @do_setup(CACHE_REDIS_MAXMEMORY_POLICY="volatile-lru")
    def test_check_redis_settings__update__maxmemory_policy(self, logger):
        self.helper.get_maxmemory.return_value = 123
        self.helper.get_maxmemory_policy.return_value = "noeviction"
        self.helper.changed = True
        KolibriCoreConfig.check_redis_settings()

        self.helper.get_maxmemory.assert_called_once()
        self.helper.set_maxmemory.assert_not_called()

        self.helper.get_maxmemory_policy.assert_called_once()
        self.helper.set_maxmemory_policy.assert_called_once_with("volatile-lru")

        self.helper.save.assert_not_called()
        logger.warning.assert_not_called()
