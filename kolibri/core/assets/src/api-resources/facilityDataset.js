const { Resource } = require('../api-resource');

class FacilityDatasetResource extends Resource {
  static resourceName() {
    return 'facilitydataset';
  }
}

module.exports = FacilityDatasetResource;
