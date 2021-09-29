// import { FacilityUserResource } from 'kolibri.api-resources';
// import store from 'kolibri.coreVue.vuex.store';

// searchFacilityUsers = search => {
//   const facilityId = store.getters.activeFacilityId;
//   FacilityUserResource.fetchCollection({
//     getParams: {
//       member_of: facilityId,
//       page_size: 30,
//       search: search,
//     },
//     force: true,
//   }).then(
//     users => {
//       return users.results;
//     },
//     error => {
//       store.dispatch('handleApiError', error);
//     }
//   );
// };
// export default searchFacilityUsers;
