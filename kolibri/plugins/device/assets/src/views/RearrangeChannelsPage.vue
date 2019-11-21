<template>

  <div>
    <p class="instructions">
      {{ $tr('instructions') }}
    </p>

    <p v-if="!loading && channels.length === 0">
      {{ $tr('noChannels') }}
    </p>

    <template v-else>
      <DragContainer class="container" :items="channels" @sort="handleOrderChange">
        <transition-group tag="div" name="list" class="wrapper">
          <Draggable v-for="(channel, index) in channels" :key="channel.id">
            <DragHandle>
              <div
                :class="$computedClass(itemClass)"
                class="item"
                :style="{ backgroundColor: $themeTokens.surface }"
              >
                <DragSortWidget
                  class="sort-widget"
                  :moveUpText="$tr('upLabel', { name: channel.name })"
                  :moveDownText="$tr('downLabel', { name: channel.name })"
                  :isFirst="index === 0"
                  :isLast="index === channels.length - 1"
                  @moveUp="shiftOne(index, -1)"
                  @moveDown="shiftOne(index, +1)"
                />
                <div class="title">
                  {{ channel.name }}
                </div>
              </div>
            </DragHandle>
          </Draggable>
        </transition-group>
      </DragContainer>
    </template>

  </div>

</template>


<script>

  import DragSortWidget from 'kolibri.coreVue.components.DragSortWidget';
  import DragContainer from 'kolibri.coreVue.components.DragContainer';
  import DragHandle from 'kolibri.coreVue.components.DragHandle';
  import Draggable from 'kolibri.coreVue.components.Draggable';
  import client from 'kolibri.client';
  import urls from 'kolibri.urls';
  import DeviceChannelResource from '../apiResources/deviceChannel';

  export default {
    name: 'RearrangeChannelsPage',
    metaInfo() {
      return {
        title: this.$tr('title'),
      };
    },
    components: {
      DragSortWidget,
      DragContainer,
      DragHandle,
      Draggable,
    },
    data() {
      return {
        loading: true,
        channels: [],
      };
    },
    computed: {
      itemClass() {
        return {
          ':hover': {
            backgroundColor: this.$themePalette.grey.v_200,
          },
        };
      },
    },
    beforeMount() {
      if (!this.$store.getters.canManageContent) {
        return this.$router.replace(this.$router.getRoute('MANAGE_CONTENT_PAGE'));
      }
      this.fetchChannels()
        .then(channels => {
          this.channels = [...channels];
          this.loading = false;
        })
        .catch(error => {
          this.$store.disptch('CORE_SET_ERROR', error);
        });

      this.$store.commit('coreBase/SET_APP_BAR_TITLE', this.$tr('title'));
    },
    methods: {
      postNewOrder(channelIds) {
        return client({
          path: urls['kolibri:kolibri.plugins.device:devicechannelorder'](),
          method: 'POST',
          entity: channelIds,
        });
      },
      fetchChannels() {
        return DeviceChannelResource.fetchCollection({
          force: true,
          getParams: {
            available: true,
          },
        });
      },
      shiftOne(index, delta) {
        const newArray = [...this.channels];
        const adjacentItem = newArray[index + delta];
        newArray[index + delta] = newArray[index];
        newArray[index] = adjacentItem;
        // This mimicks the object emitted by @sort event
        this.handleOrderChange({ newArray });
      },
      handleOrderChange(event) {
        const oldArray = [...this.channels];
        // NOTE: have to update channels before POST because doing it after
        // causes a brief 'pick-up' animation after item is dropped.
        this.channels = [...event.newArray];
        this.postNewOrder(event.newArray.map(x => x.id))
          .then(() => {
            this.$store.dispatch('createSnackbar', this.$tr('successNotification'));
          })
          .catch(() => {
            // HACK completely reset the array to undo the move on the drag list
            this.channels = [];
            this.$nextTick().then(() => {
              this.channels = oldArray;
            });
            this.$store.dispatch('createSnackbar', this.$tr('failureNotification'));
          });
      },
    },
    $trs: {
      instructions: {
        message: 'Control the order in which channels will be displayed to learners and coaches',
        context: '\nText explaining how the channel reordering feature works',
      },
      successNotification: {
        message: 'Channel order saved',
        context: '\nSuccess message shown when the admin re-orders channels',
      },
      failureNotification: 'There was a problem reordering the channels',
      noChannels: 'There are no channels',
      upLabel: 'Move {name} up one',
      downLabel: 'Move {name} down one',
      title: 'Edit channel order',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .instructions {
    margin-bottom: 32px;
  }

  .sort-widget {
    width: 24px;
    height: 24px;
  }

  .item {
    display: flex;
    padding: 8px;
    cursor: grab;
    user-select: none;
    border-radius: $radius;
  }

  .title {
    margin-left: 24px;
  }

  .container {
    max-width: 480px;
  }

</style>
