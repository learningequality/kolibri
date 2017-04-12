const { Resource } = require('../api-resource');

/**
 * @example <caption>Get Datasets for a given Facility</caption>
 * FacilityDatasetResource.getCollection({ facility_id: 1 })
 */
class FacilityDatasetResource extends Resource {
  static resourceName() {
    return 'facilitydataset';
  }
}

module.exports = FacilityDatasetResource;
