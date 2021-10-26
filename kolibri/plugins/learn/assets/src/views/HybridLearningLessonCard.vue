<template>

  <div
    class="card"
    :class="[
      { 'mobile-card': isMobile },
      $computedClass({ ':focus': $coreOutline })
    ]"
    :style="{ backgroundColor: $themeTokens.surface }"
  >
    <router-link
      :to="link"
      class="card-content"
    >
      <div class="thumbnail">
        <CardThumbnail
          v-bind="{ thumbnail, kind, isMobile }"
          :activityLength="activityLength"
        />
      </div>
      <h3 class="title">
        <TextTruncator
          :text="title"
          :maxHeight="maxTitleHeight"
          :style="{ color: $themeTokens.text }"
        />
      </h3>
      <LearningActivityLabel
        :contentNode="contentNode"
        class="learning-activity-label"
        :style="{ color: $themeTokens.text }"
      />
      <div class="footer">
        <ProgressIcon v-if="completed" :progress="progress" class="completion-icon" />
        <p v-if="completed" class="completion-label" :style="{ color: $themePalette.grey.v_700 }">
          {{ coreString('completedLabel') }}
        </p>
        <KLinearLoader
          v-if="progress && !completed"
          class="k-linear-loader"
          :delay="false"
          :progress="progress * 100"
          type="determinate"
          :style="{ backgroundColor: $themeTokens.fineLine }"
        />
      </div>
    </router-link>
  </div>

</template>


<script>

  import { validateLinkObject, validateContentNodeKind } from 'kolibri.utils.validators';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';
  import LearningActivityLabel from './cards/ResourceCard/LearningActivityLabel';
  import commonLearnStrings from './commonLearnStrings';
  import CardThumbnail from './HybridLearningContentCard/CardThumbnail';

  export default {
    name: 'HybridLearningLessonCard',
    components: {
      CardThumbnail,
      TextTruncator,
      LearningActivityLabel,
      ProgressIcon,
    },
    mixins: [commonLearnStrings, commonCoreStrings],
    props: {
      title: {
        type: String,
        required: true,
      },
      thumbnail: {
        type: String,
        default: null,
      },
      kind: {
        type: String,
        required: true,
        validator: validateContentNodeKind,
      },
      contentNode: {
        type: Object,
        required: true,
      },
      link: {
        type: Object,
        required: true,
        validator: validateLinkObject,
      },
      isMobile: {
        type: Boolean,
        default: false,
      },
      progress: {
        type: Number,
        default: null,
      },
      activityLength: {
        type: String,
        default: null,
      },
    },
    computed: {
      maxTitleHeight() {
        return 40;
      },
      completed() {
        return this.progress >= 1;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  @import './ContentCard/card';

  $margin: 24px;

  .card {
    @extend %dropshadow-1dp;

    position: relative;
    display: inline-block;
    width: 100%;
    height: 156px;
    vertical-align: top;
    border-radius: 8px;
    transition: box-shadow $core-time ease;
    &:hover {
      @extend %dropshadow-8dp;
    }
    &:focus {
      outline-width: 4px;
      outline-offset: 6px;
    }
  }

  .title {
    max-width: 80%;
    margin: 4px 0 0 24px;
  }

  .card-thumbnail-wrapper {
    height: 60px;
    margin-top: 16px;
  }

  .card-content {
    text-decoration: none;
  }

  .thumbnail {
    display: inline-block;
    width: 100px;
    margin-top: 8px;
    margin-right: 24px;
    margin-left: 24px;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    padding-left: 24px;
    margin-top: 8px;
  }

  .learning-activity-label {
    position: absolute;
    top: 24px;
    right: 24px;
    width: 100px;
    /deep/ .learning-activity {
      justify-content: flex-end;
    }
  }

  .k-linear-loader {
    display: block;
    margin-bottom: 0;
  }

  .completion-icon {
    /deep/ svg {
      max-width: 14px;
      max-height: 14px;
    }
  }

  .completion-label {
    margin: 0;
    font-size: 13px;
  }

  .mobile-card.card {
    width: 100%;
    height: 156px;
  }

  .mobile-card {
    .thumbnail {
      margin-left: 24px;
    }
    .card-thumbnail-wrapper {
      height: 60px;
      margin-top: 16px;
    }
  }

</style>
