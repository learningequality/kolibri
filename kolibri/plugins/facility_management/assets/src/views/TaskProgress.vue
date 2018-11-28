<template>

  <div class="task-progress">
    <div class="progress-icon dtc">
      <transition name="fade" mode="out-in">
        <KCircularLoader
          class="inprogress"
          :delay="false"
        />
      </transition>
    </div>
    <div class="progress-bar dtc">
      <div class="task-stage">
        {{ $tr('generatingLog') }}
      </div>
    </div>
  </div>

</template>


<script>

  import KCircularLoader from 'kolibri.coreVue.components.KCircularLoader';

  const RequiredString = {
    type: String,
    required: true,
  };

  export default {
    name: 'TaskProgress',
    components: {
      KCircularLoader,
    },
    props: {
      type: RequiredString,
      id: RequiredString,
    },
    data() {
      return {
        uiBlocked: false,
      };
    },
    $trs: {
      generatingLog: 'Generating log file...',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .progress-icon {
    width: 5%;
    text-align: center;
    .inprogress {
      display: inline-block;
    }
  }

  .task-progress {
    display: table;
    width: 100%;
    height: 5em;
    padding-right: 1em;
    padding-left: 1em;
    vertical-align: middle;
  }

  .task-stage {
    margin-bottom: 0.5em;
  }

  .progress-messages {
    padding-right: 1em;
    padding-left: 1em;
  }

  .dtc {
    display: table-cell;
    vertical-align: inherit;
  }

</style>
