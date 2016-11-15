<template>

  <div>
    <!--NOT STARTED-->
    <svg v-if="isNotStarted" src="./progress-icons/notstarted.svg" class="progress-icon"></svg>
    <!--IN PROGRESS-->
    <svg v-if="isInProgress" src="./progress-icons/inprogress.svg" class="progress-icon"></svg>
    <!--COMPLETE-->
    <svg v-if="isComplete" src="./progress-icons/complete.svg" class="progress-icon"></svg>
    <!--TODO: ADD VIEWED AND NOT VIEWED-->
  </div>

</template>


<script>

  const Constants = require('kolibri.coreVue.vuex.constants');
  const values = require('lodash.values');

  module.exports = {
    props: {
      progress: {
        type: Number,
        required: false,
        validator(value) {
          return (value >= 0) && (value <= 1);
        },
      },
      kind: {
        type: String,
        required: true,
        validator(value) {
          const validValues = values(Constants.ContentNodeKinds);
          validValues.push(Constants.USER);
          return validValues.includes(value);
        },
      },
    },
    computed: {
      Constants() {
        return Constants;
      },
      isNotStarted() {
        return this.progress === 0 || this.progress === undefined;
      },
      isInProgress() {
        return (this.progress > 0) && (this.progress < 1);
      },
      isComplete() {
        return this.progress === 1;
      },
    },
    methods: {

      is(kind) {
        return this.kind === kind;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .content-icon
    width: 100%
    height: 100%

  .color-action
    fill: $core-action-normal

  .color-text-default
    fill: $core-text-default

</style>
