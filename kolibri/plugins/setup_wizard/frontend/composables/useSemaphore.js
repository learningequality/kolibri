import { ref, onUnmounted, computed } from 'vue';

export function useSemaphore(maxConcurrency = 3) {
  const activeCount = ref(0);
  const waitQueue = ref([]);
  const pendingCount = computed(() => waitQueue.value.length);

  let isDisposed = false; // To prevent actions after unmount

  const acquire = () => {
    return new Promise(resolve => {
      if (activeCount.value < maxConcurrency) {
        activeCount.value++;
        resolve();
      } else {
        waitQueue.value.push(resolve);
      }
    });
  };

  const release = () => {
    if (isDisposed) return;

    activeCount.value--;
    if (pendingCount.value > 0) {
      activeCount.value++;
      const next = waitQueue.value.shift();
      next();
    }
  };

  const enqueue = async task => {
    await acquire();
    try {
      // Do not run the task if the component was unmounted
      if (isDisposed) return;
      return await task();
    } finally {
      release();
    }
  };

  onUnmounted(() => {
    isDisposed = true;
    waitQueue.value.length = 0; // Clear the queue
  });

  return {
    enqueue,
    activeCount,
    pendingCount,
  };
}
