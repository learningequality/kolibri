import logger from 'kolibri-logging';
import { ref, onMounted, onUnmounted } from 'vue';
import { useTimeoutPoll } from '@vueuse/core';
import TaskResource from 'kolibri/apiResources/TaskResource';

const taskPollers = new Map();

const logging = logger.getLogger(__filename);

export default function useTaskPolling(queueName) {
  if (!taskPollers.has(queueName)) {
    const consumers = ref(0);
    const tasks = ref([]);
    const { pause, resume, isActive } = useTimeoutPoll(
      async () => {
        try {
          tasks.value = await TaskResource.list({ queue: queueName });
        } catch (e) {
          logging.error('Error while fetching tasks', e);
        }
      },
      5000,
      { immediate: true },
    );

    taskPollers.set(queueName, { consumers, tasks, pause, resume, isActive });
  }

  const poller = taskPollers.get(queueName);

  onMounted(() => {
    poller.consumers.value++;
    if (!poller.isActive.value) {
      poller.resume();
    }
  });

  onUnmounted(() => {
    poller.consumers.value--;
    if (poller.consumers.value === 0) {
      poller.pause();
      taskPollers.delete(queueName);
    }
  });

  return { tasks: poller.tasks };
}
