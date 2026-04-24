import router from 'kolibri/router';

export default function samePageCheckGenerator(route) {
  const initialFullPath = route ? route.fullPath : router.currentRoute.fullPath;
  return () => router.currentRoute.fullPath === initialFullPath;
}
