import { Resource } from '../api-resource';

export default class FacilityUsernameResource extends Resource {
  static resourceName() {
    return 'facilityusername';
  }
  static idKey() {
    return 'username';
  }
}
