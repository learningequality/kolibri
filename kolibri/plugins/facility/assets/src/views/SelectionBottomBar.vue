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

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

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
          return value === 'learners' || value === 'coaches';
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
    $trs: {
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
