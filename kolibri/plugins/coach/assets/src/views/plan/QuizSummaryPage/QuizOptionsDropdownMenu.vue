<template>

  <KDropdownMenu
    :text="coachStrings.$tr('optionsLabel')"
    :options="options"
    appearance="raised-button"
    :primary="false"
    @select="$emit('select', $event.value)"
  />

</template>


<script>

  import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
  import { coachStrings } from '../../common/commonCoachStrings';

  export default {
    name: 'QuizOptionsDropdownMenu',
    components: {
      KDropdownMenu,
    },
    computed: {
      coachStrings() {
        return coachStrings;
      },
      options() {
        return [
          {
            label: this.coachStrings.$tr('editDetailsAction'),
            value: 'EDIT_DETAILS',
          },
          {
            label: this.$tr('copyQuizAction'),
            value: 'COPY',
          },
          { label: this.coachStrings.$tr('deleteAction'), value: 'DELETE' },
        ];
      },
    },
    $trs: {
      copyQuizAction: 'Copy quiz',
    },
  };

</script>


<style lang="scss" scoped></style>
