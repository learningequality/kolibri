<template>

  <td>
    <template v-if="num !== undefined">
      <ProgressBar :progress="num" />
      <div v-if="extraText" class="extra-text">
        <mat-svg category="social" name="person" class="person-icon" />
        {{ extraText }}
      </div>
    </template>
    <template v-else>
      <div class="tal">
        –
      </div>
    </template>
  </td>

</template>


<script>

  import ProgressBar from 'kolibri.coreVue.components.ProgressBar';

  export default {
    name: 'ProgressCell',
    $trs: {
      completed: 'completed by {0, number, integer} learners',
      pct: '{0, number, percent}',
    },
    components: { ProgressBar },
    props: {
      num: { type: Number },
      isExercise: {
        type: Boolean,
        default: false,
      },
      numusers: { type: Number },
    },
    computed: {
      extraText() {
        if (this.numusers === undefined) {
          return null;
        }
        return this.$tr('completed', this.numusers);
      },
    },
  };

</script>


<style lang="scss" scoped>

  td {
    width: 19%;
    text-align: center;
  }

  .tal {
    text-align: left;
  }

  .extra-text {
    font-size: smaller;
  }

  .person-icon {
    position: relative;
    top: 8px;
    width: 15px;
  }

</style>
