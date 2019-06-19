<template>

  <span>
    <KLabeledIcon :style="active ? {} : { color: $themeTokens.textDisabled }">
      <KIcon
        slot="icon"
        dot
        :color="active ? $themeTokens.success : $themeTokens.textDisabled"
      />
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
    name: 'QuizActive',
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
          ? this.coachCommon$tr('quizActiveLabel')
          : this.coachCommon$tr('quizInactiveLabel');
      },
    },
  };

</script>


<style lang="scss" scoped></style>
