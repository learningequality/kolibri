<template>

  <span>
    <KLabeledIcon :style="active ? {} : { color: $coreGrey300 }">
      <KIcon slot="icon" dot :color="active ? $coreStatusCorrect : $coreGrey300" />
      {{ label }}
    </KLabeledIcon>
  </span>

</template>


<script>

  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

  export default {
    name: 'QuizActive',
    components: {
      KLabeledIcon,
      KIcon,
    },
    mixins: [themeMixin],
    props: {
      active: {
        type: Boolean,
        required: true,
      },
    },
    computed: {
      label() {
        return this.active ? this.$tr('active') : this.$tr('inactive');
      },
    },
    $trs: {
      active: 'Active',
      inactive: 'Inactive',
    },
  };

</script>


<style lang="scss" scoped></style>
