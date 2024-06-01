<template>

  <KButton
    hasDropdown
    appearance="flat-button"
    :text="coreString('optionsLabel')"
  >
    <template #menu>
      <KDropdownMenu
        :options="options"
        @select="$emit('select', $event.value)"
      />
    </template>
  </KButton>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { coachStringsMixin } from '../../common/commonCoachStrings';

  export default {
    name: 'QuizOptionsDropdownMenu',
    mixins: [coachStringsMixin, commonCoreStrings],
    props: {
      // Should be either 'report' or 'plan',
      optionsFor: {
        type: String,
        required: true,
        validator(opt) {
          return ['plan', 'report'].includes(opt);
        },
      },
      draft: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      options() {
        const edit = {
          label: this.draft ? this.coreString('editAction') : this.coreString('editDetailsAction'),
          value: 'EDIT_DETAILS',
        };
        if (this.optionsFor === 'plan') {
          return [
            edit,
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
          edit,
          {
            label: this.coachString('printReportAction'),
            value: 'PRINT_REPORT',
          },
          {
            label: this.coachString('exportCSVAction'),
            value: 'EXPORT',
          },
        ];
      },
    },
    $trs: {
      copyQuizAction: {
        message: 'Copy quiz',
        context:
          'Coaches can copy a quiz to a different group, another class or individual learners.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
