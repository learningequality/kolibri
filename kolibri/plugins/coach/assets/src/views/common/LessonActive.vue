<template>

  <span>
    <KLabeledIcon :style="active ? null : { color: $coreGrey300 }">
      <KIcon slot="icon" dot :color="active ? $coreStatusCorrect : $coreGrey300" />
      {{ label }}
    </KLabeledIcon>
  </span>

</template>


<script>

  import { mapGetters } from 'vuex';
  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import KIcon from 'kolibri.coreVue.components.KIcon';

  export default {
    name: 'LessonActive',
    components: {
      KLabeledIcon,
      KIcon,
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
