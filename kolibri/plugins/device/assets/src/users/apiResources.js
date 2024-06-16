import { Resource } from 'kolibri.lib.apiResource';

export const FacilityImportResource = new Resource({
  name: 'facilityimport',
  namespace: 'kolibri.plugins.setup_wizard',
  listfacilitylearners(params) {
    return this.postListEndpoint('listfacilitylearners', params).then(response => {
      return response.data;
    });
  },
});
