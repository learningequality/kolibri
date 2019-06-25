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
  import { coreStringsMixin } from 'kolibri.coreVue.mixins.coreStringsMixin';
  import { coachStringsMixin } from '../../common/commonCoachStrings';

  export default {
    name: 'QuizOptionsDropdownMenu',
    components: {
      KDropdownMenu,
    },
    mixins: [coachStringsMixin, coreStringsMixin],
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
          label: this.coachCommon$tr('editDetailsAction'),
          value: 'EDIT_DETAILS',
        };
        if (this.optionsFor === 'plan') {
          return [
            editDetails,
            {
              label: this.$tr('copyQuizAction'),
              value: 'COPY',
            },
            { label: this.coreCommon$tr('deleteAction'), value: 'DELETE' },
          ];
        }
        return [
          {
            label: this.coachCommon$tr('previewAction'),
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
