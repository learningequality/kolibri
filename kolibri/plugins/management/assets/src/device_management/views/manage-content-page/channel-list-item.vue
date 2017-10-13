<template>

  <div class="channel-list-item">

    <div class="thumbnail dtc">
      <img v-if="thumbnailImg" :src="thumbnailImg" />
      <div v-else class="default-icon">
        <mat-svg category="navigation" name="apps" />
      </div>
    </div>

    <div class="details dtc">

      <div class="details-top">
        <div class="other-details">
          <div v-if="inImportingMode && onDevice" class="on-device">
            <mat-svg category="action" name="check_circle" />
            {{ $tr('onYourDevice') }}
          </div>
          <div v-if="inManagingMode" class="resources-size">
            {{ resourcesSizeText }}
          </div>
        </div>
        <div class="title">
          {{ channel.name }}
        </div>
        <div class="version">
          {{ $tr('version', { version: channel.version }) }}
        </div>
      </div>

      <div class="details-bottom">
        <div class="description">
          {{ channel.description || $tr('defaultDescription') }}
        </div>
      </div>

    </div>

    <div class="buttons dtc">
      <k-button
        v-if="inImportingMode"
        @click="$emit('clickselect')"
        name="select"
        :text="$tr('selectButton')"
      />
      <k-button
        v-if="inManagingMode"
        @click="$emit('clickdelete')"
        name="delete"
        :text="$tr('deleteButton')"
        :disabled="tasksInQueue"
      />
    </div>
  </div>

</template>


<script>

  import bytesForHumans from './bytesForHumans';
  import kButton from 'kolibri.coreVue.components.kButton';

  const IMPORTING = 'importing';
  const MANAGING = 'managing';

  export default {
    name: 'channelListItem',
    components: {
      kButton,
    },
    props: {
      channel: {
        type: Object,
        required: true,
      },
      mode: {
        type: String,
        required: true,
      },
      onDevice: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      inImportingMode() {
        return this.mode === IMPORTING;
      },
      inManagingMode() {
        return this.mode === MANAGING;
      },
      resourcesSizeText() {
        return this.$tr('resourcesSize', { size: bytesForHumans(this.channel.total_file_size) });
      },
      thumbnailImg() {
        return this.channel.thumbnail;
      },
      tasksInQueue() {
        const { taskList = [] } = this.pageState;
        return taskList.length > 0;
      },
    },
    vuex: {
      getters: {
        pageState: ({ pageState }) => pageState,
      },
    },
    $trs: {
      deleteButton: 'Delete',
      onYourDevice: 'On your device',
      resourcesSize: '{size} resources',
      selectButton: 'Select',
      version: 'Version {version}',
      defaultDescription: '(No description)',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .dtc
    display: table-cell
    vertical-align: inherit

  .channel-list-item
    display: table
    vertical-align: middle

  .title
    font-size: 1.2em
    font-weight: bold
    line-height: 1.5em

  .version
    font-size: 0.85em
    color: $core-text-annotation

  .description
    padding: 1em 0

  .thumbnail
    width: 10%
    text-align: left
    img
      width: 100%

  .default-icon
    background-color: $core-grey
    text-align: center
    svg
      width: 50%
      height: 50%
      margin: 20px

  .details
    width: 100%
    position: relative
    padding: 0 2em

  .other-details
    float: right
    line-height: 1.7em

  .buttons
    width: 10%
    text-align: right
    vertical-align: baseline

</style>
