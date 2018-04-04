<template>

  <td>
    <template v-if="num !== undefined">
      <progress-bar :progress="num" />
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

  import progressBar from 'kolibri.coreVue.components.progressBar';

  export default {
    name: 'progressIndicator',
    $trs: {
      completed: 'completed by {0, number, integer} learners',
      pct: '{0, number, percent}',
    },
    components: { progressBar },
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


<style lang="stylus" scoped>

  td
    text-align: center
    width: 19%

  .tal
    text-align: left

  .extra-text
    font-size: smaller

  .person-icon
    position: relative
    top: 8px
    width: 15px

</style>
