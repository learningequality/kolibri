import { Resource } from '../api-resource';

/**
 * @example <caption>Get Datasets for a given Facility</caption>
 * FacilityDatasetResource.getCollection({ facility_id: 1 })
 */
export default class FacilityDatasetResource extends Resource {
  static resourceName() {
    return 'facilitydataset';
  }
}
