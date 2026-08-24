import { Resource } from 'kolibri/apiResource';

/**
 * @example Get Datasets for a given Facility
 * FacilityDatasetResource.list({ facility_id: 1 })
 */
export default new Resource({
  name: 'facilitydataset',
});
