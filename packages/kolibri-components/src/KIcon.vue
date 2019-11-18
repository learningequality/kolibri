<template>

  <!-- eslint-disable max-len -->

  <!-- tracking -->
  <mat-svg v-if="icon === 'correct'" name="check_circle" category="action" :style="style" />
  <mat-svg v-else-if="icon ==='helpNeeded'" name="error" category="alert" :style="style" />
  <mat-svg v-else-if="icon ==='hint'" name="lightbulb_outline" category="action" :style="style" />
  <mat-svg v-else-if="icon ==='incorrect'" name="close" category="navigation" :style="style" />
  <mat-svg v-else-if="icon ==='inProgress'" name="access_time" category="device" :style="style" />
  <mat-svg v-else-if="icon ==='mastered'" name="stars" category="action" :style="style" />
  <mat-svg v-else-if="icon ==='notStarted'" name="brightness_1" category="image" :style="style" />
  <mat-svg v-else-if="icon ==='rectified'" name="lens" category="image" :style="style" />
  <!-- coaching -->
  <mat-svg v-else-if="icon ==='coach'" name="local_library" category="maps" :style="style" />
  <mat-svg v-else-if="icon ==='lesson'" name="import_contacts" category="communication" :style="style" />
  <mat-svg v-else-if="icon ==='question'" name="keyboard_arrow_right" category="hardware" :style="style" :class="flip" />
  <mat-svg v-else-if="icon ==='quiz'" name="assignment_late" category="action" :style="style" />
  <!-- content -->
  <mat-svg v-else-if="icon ==='app' || icon === 'html5'" name="widgets" category="device" :style="style" />
  <mat-svg v-else-if="icon ==='audio'" name="audiotrack" category="image" :style="style" />
  <mat-svg v-else-if="icon ==='channel'" name="apps" category="navigation" :style="style" />
  <mat-svg v-else-if="icon ==='doc' || icon ==='document'" name="book" category="action" :style="style" />
  <mat-svg v-else-if="icon ==='exercise'" name="assignment" category="action" :style="style" />
  <mat-svg v-else-if="icon ==='topic'" name="folder" category="file" :style="style" />
  <mat-svg v-else-if="icon ==='video'" name="ondemand_video" category="notification" :style="style" />
  <mat-svg v-else-if="icon ==='slideshow'" name="photo_library" category="image" :style="style" />
  <mat-svg v-else-if="icon ==='unlistedchannel'" name="lock_open" category="action" :style="style" />
  <mat-svg v-else-if="icon ==='multiple'" name="view_module" category="action" :style="style" />
  <mat-svg v-else-if="icon ==='done'" name="done" category="action" :style="style" />
  <!-- users -->
  <mat-svg v-else-if="icon ==='classroom'" name="business" category="communication" :style="style" />
  <mat-svg v-else-if="icon ==='group'" category="action" name="group_work" :style="style" />
  <mat-svg v-else-if="icon ==='people'" name="people" category="social" :style="style" />
  <mat-svg v-else-if="icon ==='person'" name="person" category="social" :style="style" />
  <mat-svg v-else-if="icon ==='permission'" name="vpn_key" category="communication" :style="style" />
  <!-- misc -->
  <mat-svg v-else-if="icon ==='dot'" name="brightness_1" category="image" :style="style" />
  <mat-svg v-else-if="icon ==='error'" name="error" category="alert" :style="style" />
  <!-- UI -->
  <mat-svg v-else-if="icon ==='back'" name="arrow_back" category="navigation" :style="style" :class="flip" />
  <mat-svg v-else-if="icon ==='forward'" name="arrow_forward" category="navigation" :style="style" :class="flip" />
  <mat-svg v-else-if="icon ==='clear'" name="clear" category="content" :style="style" />
  <mat-svg v-else-if="icon ==='dropdown'" name="arrow_drop_down" category="navigation" :style="style" />
  <mat-svg v-else-if="icon ==='language'" name="language" category="action" :style="style" />
  <mat-svg v-else-if="icon ==='logout'" name="exit_to_app" category="action" :style="style" :class="flip" />
  <mat-svg v-else-if="icon ==='menu'" name="menu" category="navigation" :style="style" />
  <mat-svg v-else-if="icon ==='search'" name="search" category="action" :style="style" />
  <!-- side nav -->
  <mat-svg v-else-if="icon ==='learn'" name="school" category="social" :style="style" />
  <mat-svg v-else-if="icon ==='device'" name="tablet_mac" category="hardware" :style="style" />
  <mat-svg v-else-if="icon ==='profile'" name="account_circle" category="action" :style="style" />
  <mat-svg v-else-if="icon ==='login'" name="exit_to_app" category="action" :style="style" />
  <mat-svg v-else-if="icon ==='logout'" name="exit_to_app" category="action" :style="style" />
  <mat-svg v-else-if="icon ==='coach'" name="assessment" category="action" :style="style" />
  <mat-svg v-else-if="icon ==='facility'" name="settings_input_antenna" category="action" :style="style" />

  <!--eslint-enable-->

</template>


<script>

  const iconTypes = [
    // tracking
    'correct',
    'helpNeeded',
    'hint',
    'incorrect',
    'inProgress',
    'mastered',
    'notStarted',
    'rectified',
    // coaching
    'coach',
    'lesson',
    'question',
    'quiz',
    // content
    'app',
    'audio',
    'channel',
    'doc',
    'document',
    'exercise',
    'topic',
    'video',
    'html5',
    'slideshow',
    'unlistedchannel',
    'multiple',
    'done',
    // users
    'classroom',
    'group',
    'people',
    'permission',
    'person',
    // misc
    'dot',
    'error',
    // UI
    'back',
    'forward',
    'clear',
    'dropdown',
    'language',
    'logout',
    'menu',
    'search',
    // side nav
    'learn',
    'device',
    'profile',
    'login',
    'logout',
    'coach',
    'facility',
  ];

  export default {
    name: 'KIcon',
    props: {
      icon: {
        type: String,
        required: true,
        validator(value) {
          return iconTypes.includes(value);
        },
      },
      /**
       * color to apply to the icon
       */
      color: {
        type: String,
        required: false,
      },
    },
    computed: {
      style() {
        if (this.color) {
          return { fill: this.color };
        }
        return { fill: this.$themeTokens.text };
      },
      flip() {
        return this.isRtl ? 'rtl-flip-icon' : null;
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

  .rtl-flip-icon {
    transform: scaleX(-1);
  }

</style>
