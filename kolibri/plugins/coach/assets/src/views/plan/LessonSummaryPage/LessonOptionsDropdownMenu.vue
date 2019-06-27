<template>

  <KDropdownMenu
    :text="coreCommon$tr('optionsLabel')"
    :options="options"
    appearance="raised-button"
    :primary="false"
    @select="$emit('select', $event.value)"
  />

</template>


<script>

  import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { coachStringsMixin } from '../../common/commonCoachStrings';

  export default {
    name: 'LessonOptionsDropdownMenu',
    components: {
      KDropdownMenu,
    },
    mixins: [coachStringsMixin, commonCoreStrings],
    props: {
      // Should be 'report' or 'plan'
      optionsFor: {
        type: String,
        required: true,
      },
    },
    computed: {
      options() {
        const editDetails = {
          label: this.coachCommon$tr('editDetailsAction'),
          value: 'EDIT_DETAILS',
        };

        if (this.optionsFor === 'plan') {
          return [
            editDetails,
            {
              label: this.$tr('copyLessonAction'),
              value: 'COPY',
            },
            { label: this.coreCommon$tr('deleteAction'), value: 'DELETE' },
          ];
        }

        return [
          editDetails,
          {
            label: this.coachCommon$tr('manageResourcesAction'),
            value: 'MANAGE_RESOURCES',
          },
        ];
      },
    },
    $trs: {
      copyLessonAction: 'Copy lesson',
    },
  };

</script>


<style lang="scss" scoped></style>
