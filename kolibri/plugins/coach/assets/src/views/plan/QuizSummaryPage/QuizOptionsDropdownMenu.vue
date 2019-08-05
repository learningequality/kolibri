<template>

  <KDropdownMenu
    :text="coreString('optionsLabel')"
    :options="options"
    appearance="raised-button"
    :primary="false"
    @select="$emit('select', $event.value)"
  />

</template>


<script>

  import KDropdownMenu from 'kolibri.shared.KDropdownMenu';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { coachStringsMixin } from '../../common/commonCoachStrings';

  export default {
    name: 'QuizOptionsDropdownMenu',
    components: {
      KDropdownMenu,
    },
    mixins: [coachStringsMixin, commonCoreStrings],
    props: {
      // Should be either 'report' or 'plan',
      optionsFor: {
        type: String,
        required: true,
      },
    },
    computed: {
      options() {
        const editDetails = {
          label: this.coreString('editDetailsAction'),
          value: 'EDIT_DETAILS',
        };
        if (this.optionsFor === 'plan') {
          return [
            editDetails,
            {
              label: this.$tr('copyQuizAction'),
              value: 'COPY',
            },
            { label: this.coreString('deleteAction'), value: 'DELETE' },
          ];
        }
        return [
          {
            label: this.coachString('previewAction'),
            value: 'PREVIEW',
          },
          editDetails,
        ];
      },
    },
    $trs: {
      copyQuizAction: 'Copy quiz',
    },
  };

</script>


<style lang="scss" scoped></style>
