<template>

  <span>
    <KLabeledIcon :style="active ? null : { color: $coreGrey300 }">
      <KIcon slot="icon" dot :color="active ? $themeTokens.correct : $coreGrey300" />
      {{ label }}
    </KLabeledIcon>
  </span>

</template>


<script>

  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import { coachStringsMixin } from './commonCoachStrings';

  export default {
    name: 'LessonActive',
    components: {
      KLabeledIcon,
      KIcon,
    },
    mixins: [themeMixin, coachStringsMixin],
    props: {
      active: {
        type: Boolean,
        required: true,
      },
    },
    computed: {
      label() {
        return this.active
          ? this.coachStrings.$tr('lessonActiveLabel')
          : this.coachStrings.$tr('lessonInactiveLabel');
      },
    },
  };

</script>


<style lang="scss" scoped></style>
