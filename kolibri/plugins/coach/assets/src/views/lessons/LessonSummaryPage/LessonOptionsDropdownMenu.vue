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
    name: 'LessonOptionsDropdownMenu',
    mixins: [coachStringsMixin, commonCoreStrings],
    computed: {
      options() {
        return [
          {
            label: this.coreString('editDetailsAction'),
            value: 'EDIT_DETAILS',
          },
          {
            label: this.$tr('copyLessonAction'),
            value: 'COPY',
          },
          {
            label: this.coachString('printReportAction'),
            value: 'PRINT_REPORT',
          },
          {
            label: this.coachString('exportCSVAction'),
            value: 'EXPORT',
          },
          { label: this.coreString('deleteAction'), value: 'DELETE' },
        ];
      },
    },
    $trs: {
      copyLessonAction: {
        message: 'Copy lesson',
        context:
          "Coaches can copy lessons to a different group or another class of their facility.\n\nThe 'Copy lesson' option appears in the Lessons section.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
