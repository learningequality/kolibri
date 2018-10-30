import { Resource } from 'kolibri.lib.apiResource';

/**
 * @example Get Datasets for a given Facility
 * FacilityDatasetResource.fetchCollection({ getParams: { facility_id: 1 } })
 */
export default new Resource({
  name: 'facilitydataset',
});
