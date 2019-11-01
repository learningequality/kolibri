<template>

  <div
    class="panel"
    :class="{'panel-sm': windowIsSmall}"
    :style="{ borderTop: `1px solid ${$themePalette.grey.v_200}` }"
  >
    <ChannelDetailPanel :channel="channel">
      <template v-slot:belowdescription>
        <CoachContentLabel
          :value="channel.num_coach_contents"
          :isTopic="true"
        />
      </template>
    </ChannelDetailPanel>

    <div
      class="col-2"
      dir="auto"
      data-test="resources-size"
    >
      {{ resourcesSizeText }}
    </div>

    <div class="col-3">
      <KDropdownMenu
        :text="coreString('optionsLabel')"
        :disabled="tasksInQueue"
        :options="dropdownOptions"
        @select="handleManageChannelAction($event.value)"
      />
    </div>
  </div>

</template>


<script>

  // ChannelPanel with Details, On-Device Size, and Options Dropdown

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import ChannelDetailPanel from '../ChannelDetailPanel';

  export default {
    name: 'WithSizeAndOptions',
    components: {
      ChannelDetailPanel,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
    props: {
      channel: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {};
    },
    computed: {
      resourcesSizeText() {
        return bytesForHumans(this.channel.on_device_file_size);
      },
      // TODO need to enforce certain rules
      tasksInQueue() {
        return false;
      },
      dropdownOptions() {
        return [
          {
            label: this.$tr('manageChannelAction'),
            value: 'MANAGE_CHANNEL',
          },
          {
            label: this.$tr('deleteChannelAction'),
            value: 'DELETE_CHANNEL',
          },
        ];
      },
    },
    methods: {
      handleManageChannelAction(action) {
        if (action === 'DELETE_CHANNEL') {
          return this.$emit('select_delete');
        }
        return this.$emit('select_manage', { ...this.channel });
      },
    },
    $trs: {
      manageChannelAction: 'Manage',
      deleteChannelAction: 'Delete channel',
    },
  };

</script>


<style lang="scss" scoped>

  .panel {
    display: flex;
    padding: 32px 0;
  }

  .panel-sm {
    flex-direction: column;
    padding: 16px 0;
  }

  .col-2 {
    min-width: 80px;
    margin-right: 16px;
    text-align: right;

    .panel-sm & {
      font-size: 14px;
      text-align: left;
    }
  }

  .col-3 {
    margin-top: -8px;

    .panel-sm & {
      margin-top: 16px;
      text-align: right;
    }
  }

</style>
