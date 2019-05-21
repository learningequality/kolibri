<template>

  <KDropdownMenu
    :text="common$tr('optionsLabel')"
    :options="options"
    appearance="raised-button"
    :primary="false"
    @select="$emit('select', $event.value)"
  />

</template>


<script>

  import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
  import { coachStringsMixin } from '../../common/commonCoachStrings';

  export default {
    name: 'LessonOptionsDropdownMenu',
    components: {
      KDropdownMenu,
    },
    mixins: [coachStringsMixin],
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
          label: this.common$tr('editDetailsAction'),
          value: 'EDIT_DETAILS',
        };

        if (this.optionsFor === 'plan') {
          return [
            editDetails,
            {
              label: this.$tr('copyLessonAction'),
              value: 'COPY',
            },
            { label: this.common$tr('deleteAction'), value: 'DELETE' },
          ];
        }

        return [
          editDetails,
          {
            label: this.$tr('manageResourcesAction'),
            value: 'MANAGE_RESOURCES',
          },
        ];
      },
    },
    $trs: {
      copyLessonAction: 'Copy lesson',
      manageResourcesAction: 'Manage resources',
    },
  };

</script>


<style lang="scss" scoped></style>
