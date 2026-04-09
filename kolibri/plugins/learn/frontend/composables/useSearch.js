import useBaseSearch from 'kolibri-common/composables/useBaseSearch';
import { currentDeviceData } from './useDevices';
import useContentNodeProgress from './useContentNodeProgress';

const { fetchContentNodeProgress } = useContentNodeProgress();

export default function (descendant) {
  const { baseurl } = currentDeviceData();
  return useBaseSearch({ descendant, baseurl, fetchContentNodeProgress });
}
