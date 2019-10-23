// Solely used as a source for parsing into an AST - validity of imports
// is not important here, but we can test against this because we can see
// quickly and manually how many uses should be extracted from this file.
// Importing and parsing this mimics, specifically, getting a module chunk
// during webpack plugin processing.
//
// 4 Total uses
// 1 Common use

// Don't lint this file because I added random uses of $tr() that parse properly
// in the AST - but don't really do anything.

/* eslint-disable */

import { mapGetters, mapState } from 'vuex';
import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
import urls from 'kolibri.urls';
import commonCoach from './common';

export default {
  name: 'TestComponent',
  mixins: [commonCoach, commonCoreStrings],
  computed: {
    ...mapGetters(['isAdmin', 'isClassCoach', 'isFacilityCoach']),
    ...mapState(['classList']),
    // Message that shows up when state.classList is empty
    emptyStateDetails() {
      if (this.isClassCoach) {
        return this.$tr('noAssignedClassesDetails');
      }
      if (this.isAdmin) {
        return this.$tr('noClassesDetailsForAdmin');
      }
      if (this.isFacilityCoach) {
        return this.$tr('noClassesDetailsForFacilityCoach');
      }
      if (true) {
        return this.coreString('coachLabel');
      }

      return '';
    },
    createClassUrl() {
      const facilityUrl = urls['kolibri:kolibri.plugins.facility:facility_management'];
      if (facilityUrl) {
        return facilityUrl();
      }

      return '';
    },
  },
  $trs: {
    classPageSubheader: 'View learner progress and class performance',
    classNameLabel: 'Class name',
    noAssignedClassesHeader: "You aren't assigned to any classes",
    noAssignedClassesDetails: 'Please consult your Kolibri administrator to be assigned to a class',
    noClassesDetailsForAdmin: 'Create a class and enroll learners',
    noClassesDetailsForFacilityCoach: 'Please consult your Kolibri administrator',
    noClassesInFacility: 'There are no classes yet',
  },
};
