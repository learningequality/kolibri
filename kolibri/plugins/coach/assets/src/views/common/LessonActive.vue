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

  import { coachStringsMixin } from './commonCoachStrings';

  export default {
    name: 'LessonActive',
    mixins: [coachStringsMixin],
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
