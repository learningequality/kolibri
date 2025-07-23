import { ref, onMounted, onUnmounted } from 'vue';
import { now as getNow } from 'kolibri/utils/serverClock';


export default function useNow(interval = 10000) {
  const now = ref(getNow());

  let timer;

  onMounted(() => {
    timer = setInterval(() => {
      now.value = getNow();
    }, interval);
  });

  onUnmounted(() => {
    clearInterval(timer);
  });

  return { now };
}
