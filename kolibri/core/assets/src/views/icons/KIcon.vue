<template>

  <!-- tracking -->
  <mat-svg v-if="correct" name="check_circle" category="action" :style="style" />
  <mat-svg v-else-if="helpNeeded" name="error" category="alert" :style="style" />
  <mat-svg v-else-if="hint" name="lightbulb_outline" category="action" :style="style" />
  <mat-svg v-else-if="incorrect" name="close" category="navigation" :style="style" />
  <mat-svg v-else-if="inProgress" name="access_time" category="device" :style="style" />
  <mat-svg v-else-if="mastered" name="stars" category="action" :style="style" />
  <mat-svg v-else-if="notStarted" name="brightness_1" category="image" :style="style" />
  <mat-svg v-else-if="rectified" name="lens" category="image" :style="style" />
  <!-- coaching -->
  <mat-svg v-else-if="coach" name="local_library" category="maps" :style="style" />
  <mat-svg v-else-if="lesson" name="import_contacts" category="communication" :style="style" />
  <mat-svg v-else-if="quiz" name="assignment_late" category="action" :style="style" />
  <!-- content -->
  <mat-svg v-else-if="app" name="widgets" category="device" :style="style" />
  <mat-svg v-else-if="audio" name="audiotrack" category="image" :style="style" />
  <mat-svg v-else-if="channel" name="apps" category="navigation" :style="style" />
  <mat-svg v-else-if="doc" name="book" category="action" :style="style" />
  <mat-svg v-else-if="exercise" name="assignment" category="action" :style="style" />
  <mat-svg v-else-if="topic" name="folder" category="file" :style="style" />
  <mat-svg v-else-if="video" name="ondemand_video" category="notification" :style="style" />
  <!-- users -->
  <mat-svg v-else-if="classroom" name="business" category="communication" :style="style" />
  <mat-svg v-else-if="people" name="people" category="social" :style="style" />
  <mat-svg v-else-if="person" name="person" category="social" :style="style" />
  <mat-svg v-else-if="permission" name="vpn_key" category="communication" :style="style" />
  <!-- misc -->
  <mat-svg v-else-if="dot" name="brightness_1" category="image" :style="style" />
  <mat-svg v-else-if="error" name="error" category="alert" :style="style" />
  <!-- UI -->
  <mat-svg v-else-if="back" name="arrow_back" category="navigation" :style="style" :class="flip" />
  <mat-svg v-else-if="clear" name="clear" category="content" :style="style" />
  <mat-svg v-else-if="dropdown" name="arrow_drop_down" category="navigation" :style="style" />
  <mat-svg v-else-if="language" name="language" category="action" :style="style" />
  <mat-svg v-else-if="logout" name="exit_to_app" category="action" :style="style" :class="flip" />
  <mat-svg v-else-if="menu" name="menu" category="navigation" :style="style" />
  <mat-svg v-else-if="search" name="search" category="action" :style="style" />

</template>


<script>

  import { mapGetters } from 'vuex';

  const boolean = {
    type: Boolean,
    default: false,
  };

  export default {
    name: 'KIcon',
    props: {
      /**
       * color to apply to the icon
       */
      color: {
        type: String,
        required: false,
      },
      // tracking
      correct: boolean,
      helpNeeded: boolean,
      hint: boolean,
      incorrect: boolean,
      inProgress: boolean,
      mastered: boolean,
      notStarted: boolean,
      rectified: boolean,
      // coaching
      coach: boolean,
      lesson: boolean,
      quiz: boolean,
      // content
      app: boolean,
      audio: boolean,
      channel: boolean,
      doc: boolean,
      exercise: boolean,
      topic: boolean,
      video: boolean,
      // users
      classroom: boolean,
      people: boolean,
      permission: boolean,
      person: boolean,
      // misc
      dot: boolean,
      error: boolean,
      // UI
      back: boolean,
      clear: boolean,
      dropdown: boolean,
      language: boolean,
      logout: boolean,
      menu: boolean,
      search: boolean,
    },
    computed: {
      ...mapGetters(['$coreTextDefault']),
      style() {
        if (this.color) {
          return { fill: this.color };
        }
        return { fill: this.$coreTextDefault };
      },
      flip() {
        return this.isRtl() ? 'rtl-icon' : null;
      },
    },
  };

</script>


<style lang="scss" scoped>

  svg {
    position: relative;
    top: 0.125em;
    width: 1.125em;
    height: 1.125em;
  }

</style>
