<template>

  <span>
    <KLabeledIcon :style="active ? null : { color: $themeTokens.textDisabled }">
      <KIcon
        slot="icon"
        icon="dot"
        :color="active ? $themeTokens.success : $themeTokens.textDisabled"
      />
      {{ label }}
    </KLabeledIcon>
  </span>

</template>


<script>

  import KThemeMixin from 'kolibri-components/src/mixins/KThemeMixin';
  import { coachStringsMixin } from './commonCoachStrings';

  export default {
    name: 'LessonActive',
    mixins: [KThemeMixin, coachStringsMixin],
    props: {
      active: {
        type: Boolean,
        required: true,
      },
    },
    computed: {
      label() {
        return this.active ? this.$tr('lessonActiveLabel') : this.$tr('lessonInactiveLabel');
      },
    },
    $trs: {
      lessonActiveLabel: 'Active',
      lessonInactiveLabel: 'Inactive',
    },
  };

</script>


<style lang="scss" scoped></style>
