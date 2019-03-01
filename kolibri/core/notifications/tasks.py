import logging as logger
import os
import threading
import time

from diskcache import Deque
from django.db import connection
from django.db import transaction

from kolibri.core.logger import models
from kolibri.core.notifications import api
from kolibri.utils.conf import KOLIBRI_HOME

logging = logger.getLogger(__name__)


queue_dir = os.path.join(KOLIBRI_HOME, 'notifications_queue')


def dehydrate_spec(fn, instance, *args):
    return {
        "function_name": fn.__name__,
        "model_type": type(instance).__name__,
        "model_id": instance.id,
        "args": args,
    }


def hydrate_and_execute_spec(notification_spec):
    function = getattr(api, notification_spec["function_name"])
    Model = getattr(models, notification_spec["model_type"])
    instance = Model.objects.get(id=notification_spec["model_id"])
    args = notification_spec["args"]
    return function(instance, *args)


class AsyncNotificationQueue():

    def __init__(self):

        # Value in seconds to determine the sleep time between log saving batches
        self.log_saving_interval = 5

        # Where new log saving functions are appended
        self.queue = Deque(directory=queue_dir)

    def append(self, fn, instance, *args):
        """
        Convenience method to append log saving function to the current queue
        """
        self.queue.append(dehydrate_spec(fn, instance, *args))

    def run(self):
        """
        Execute any log saving functions in the self.running list
        """
        if self.queue:
            # Do this conditionally to avoid opening an unnecessary transaction
            with transaction.atomic():
                while self.queue:
                    spec = self.queue.popleft()
                    try:
                        logging.warn('>>>>>> AsyncNotificationQueue.run try')
                        hydrate_and_execute_spec(spec)
                    except Exception as e:
                        # Catch all exceptions and log, otherwise the background process will end
                        # and no more logs will be saved!
                        logging.warn('>>>>>> AsyncNotificationQueue.run except {}'.format(e))
                        logging.debug("Exception raised during background notification calculation: ", e)
            connection.close()

    def start(self):
        while True:
            self.run()
            time.sleep(self.log_saving_interval)


log_queue = AsyncNotificationQueue()


def wrap_to_save_queue(fn, instance, *args):
    # Only allow functions that are in the notifications api
    if hasattr(api, fn.__name__):
        # Also only allow models from the core loggers for now
        if hasattr(models, type(instance).__name__):
            log_queue.append(fn, instance, *args)
        else:
            logging.warn('Wrap to save queue called on non-model, model {model} from {module}'.format(
                fn=type(instance).__name__,
                module=type(instance).__module__,
            ))
    else:
        logging.warn('Wrap to save queue called on non-notification api task, function {fn} from {module}'.format(
            fn=fn.__name__,
            module=fn.__module__,
        ))


class AsyncNotificationsThread(threading.Thread):

    @classmethod
    def start_command(cls):
        logging.warn('>>>>>> AsyncNotificationsThread.start_command: {}'.format(threading.currentThread().ident))
        thread = cls()
        thread.daemon = True
        thread.start()

    def run(self):
        logging.info("Initializing background log saving process")
        logging.warn('>>>>>> AsyncNotificationsThread.run: {}'.format(threading.currentThread().ident))
        log_queue.start()
