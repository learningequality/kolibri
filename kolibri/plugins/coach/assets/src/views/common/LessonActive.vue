<template>

  <span>
    <LabeledIcon
      :label="label"
      :style="active ? {} : { color: $coreGrey300 }"
    >
      <mat-svg
        v-if="active"
        category="image"
        name="brightness_1"
        :style="{ fill: $coreStatusCorrect }"
      />
      <mat-svg
        v-else
        category="image"
        name="brightness_1"
        :style="{ fill: $coreGrey300 }"
      />
    </LabeledIcon>
  </span>

</template>


<script>

  import { mapGetters } from 'vuex';
  import LabeledIcon from './LabeledIcon';

  export default {
    name: 'LessonActive',
    components: {
      LabeledIcon,
    },
    props: {
      active: {
        type: Boolean,
        required: true,
      },
    },
    $trs: {
      active: 'Active',
      inactive: 'Inactive',
    },
    computed: {
      ...mapGetters(['$coreStatusCorrect', '$coreGrey300']),
      label() {
        return this.active ? this.$tr('active') : this.$tr('inactive');
      },
    },
  };

</script>


<style lang="scss" scoped></style>
