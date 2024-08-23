import useBaseSearch from 'kolibri-common/composables/useBaseSearch';
import { currentDeviceData } from './useDevices';
import useContentNodeProgress from './useContentNodeProgress';

const { fetchContentNodeProgress } = useContentNodeProgress();

export default function (descendant, store, router) {
  const { baseurl } = currentDeviceData(store);
  return useBaseSearch({ descendant, store, router, baseurl, fetchContentNodeProgress });
}
