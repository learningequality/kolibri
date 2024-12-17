<template>

  <KIconButton
    hasDropdown
    icon="optionsHorizontal"
    appearance="flat-button"
    :ariaLabel="coreString('optionsLabel')"
  >
    <template #menu>
      <KDropdownMenu
        :options="options"
        @select="$emit('select', $event.value)"
      />
    </template>
  </KIconButton>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { coachStringsMixin } from '../../common/commonCoachStrings';

  export default {
    name: 'QuizOptionsDropdownMenu',
    mixins: [coachStringsMixin, commonCoreStrings],
    props: {
      exam: {
        type: Object,
        required: false,
        default: null,
      },
    },
    computed: {
      options() {
        const options = [
          {
            label: this.$tr('copyQuizAction'),
            value: 'COPY',
          },
          { label: this.coreString('deleteAction'), value: 'DELETE' },
        ];
        if (!this.exam?.archive) {
          options.unshift({
            label: this.exam?.draft
              ? this.coreString('editAction')
              : this.coreString('editDetailsAction'),
            value: 'EDIT_DETAILS',
          });
        }
        return options;
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
