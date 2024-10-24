<template>

  <BottomAppBar>
    <span class="message">{{ selectedMessage }}</span>
    <KButton
      :disabled="$attrs.disabled || buttonsDisabled"
      :text="coreString('confirmAction')"
      :primary="true"
      @click="$emit('click-confirm')"
    />
  </BottomAppBar>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import BottomAppBar from 'kolibri/components/BottomAppBar';

  export default {
    name: 'SelectionBottomBar',
    components: {
      BottomAppBar,
    },
    mixins: [commonCoreStrings],
    props: {
      count: {
        type: Number,
        required: true,
      },
      type: {
        type: String,
        required: true,
        validator(value) {
          return value === 'learners' || value === 'coaches';
        },
      },
    },
    computed: {
      buttonsDisabled() {
        return this.count === 0;
      },
      selectedMessage() {
        return this.type === 'learners'
          ? this.$tr('learnersSelectedMessage', { count: this.count })
          : this.$tr('coachesSelectedMessage', { count: this.count });
      },
    },
    $trs: {
      coachesSelectedMessage: {
        message: '{count, number} {count, plural, one {coach} other {coaches}} selected',
        context:
          "Indicates how many coaches have been selected to be assigned to a class in the 'Assign a coach' page.",
      },
      learnersSelectedMessage: {
        message: '{count, number} {count, plural, one {learner} other {learners}} selected',
        context:
          "Indicates how many learners have been selected to be assigned to a class in the 'Assign a coach' page.\n",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .message {
    display: inline-block;
    margin-right: 16px;
  }

</style>
