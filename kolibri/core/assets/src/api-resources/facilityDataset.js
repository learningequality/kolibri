import { Resource } from '../api-resource';

/**
 * @example <caption>Get Datasets for a given Facility</caption>
 * FacilityDatasetResource.getCollection({ facility_id: 1 })
 */
export default new Resource({
  name: 'facilitydataset',
});
