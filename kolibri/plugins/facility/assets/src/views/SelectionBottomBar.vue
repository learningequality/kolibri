<template>

  <BottomAppBar>
    <span class="message">{{ selectedMessage }}</span>
    <KButton
      :disabled="$attrs.disabled || buttonsDisabled"
      :text="coreString('confirmAction')"
      :primary="true"
      @click="$emit('clickconfirm')"
    />
  </BottomAppBar>

</template>


<script>

  import sumBy from 'lodash/sumBy';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  // Shows a 'EXPORT', 'IMPORT', or 'DELETE' button next to a message
  // of how many items are selected plus their size.
  export default {
    name: 'SelectionBottomBar',
    components: {
      BottomAppBar,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    props: {
      counts: {
        type: Number,
        required: true,
      },
      type: {
        type: String,
        required: true,
        validator(value) {
          return value === 'learner' || value === 'coach';
        },
      },
    },
    computed: {
      buttonsDisabled() {
        return this.counts === 0;
      },
      selectedMessage() {
        return this.counts === 0
          ? this.$tr('zeroSelectedMessage', { type: this.type })
          : this.$tr('selectedMessage', { counts: this.counts, type: this.type });
      },
    },
    watch: {},
    $trs: {
      confirmAction: 'Confirm',
      zeroSelectedMessage: '0 {type} selected',
      selectedMessage: '{counts} {type} selected',
    },
  };

</script>


<style lang="scss" scoped>

  .message {
    display: inline-block;
    margin-right: 16px;
  }

</style>
