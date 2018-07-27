import urls from 'kolibri.urls';
import { Resource } from '../api-resource';

export default new Resource({
  name: 'deviceprovision',
  get collectionUrl() {
    return urls[this.name];
  },
});
