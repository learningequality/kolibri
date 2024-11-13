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

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { coachStringsMixin } from '../../common/commonCoachStrings';

  export default {
    name: 'QuizOptionsDropdownMenu',
    mixins: [coachStringsMixin, commonCoreStrings],
    props: {
      draft: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      options() {
        return [
          {
            label: this.draft
              ? this.coreString('editAction')
              : this.coreString('editDetailsAction'),
            value: 'EDIT_DETAILS',
          },
          {
            label: this.$tr('copyQuizAction'),
            value: 'COPY',
          },
          { label: this.coreString('deleteAction'), value: 'DELETE' },
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
