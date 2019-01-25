import { Resource } from 'kolibri.lib.apiResource';

export default new Resource({
  name: 'remotechannel',
  getKolibriStudioStatus() {
    return this.getListEndpoint('kolibri_studio_status');
  },
  fetchChannelList(id) {
    return this.fetchDetailCollection('retrieve_list', id);
  },
});
