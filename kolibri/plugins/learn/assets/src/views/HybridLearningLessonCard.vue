<template>

  <div class="card drop-shadow">
    <router-link
      :to="link"
      class="card card-content"
      :class="[
        { 'mobile-card': isMobile },
        $computedClass({ ':focus': $coreOutline })
      ]"
      :style="{ backgroundColor: $themeTokens.surface }"
    >
      <div class="thumbnail">
        <CardThumbnail
          :isMobile="isMobile"
          :contentNode="content"
          :hideDuration="true"
        />
      </div>
      <h3 class="title">
        <TextTruncator
          :text="content.title"
          :maxHeight="maxTitleHeight"
          :style="{ color: $themeTokens.text }"
        />
      </h3>
      <LearningActivityLabel
        :contentNode="content"
        class="learning-activity-label"
        :style="{ color: $themeTokens.text }"
      />
      <div class="footer">
        <ProgressBar :contentNode="content" />
      </div>
    </router-link>
  </div>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ProgressBar from './ProgressBar';
  import LearningActivityLabel from './LearningActivityLabel';
  import commonLearnStrings from './commonLearnStrings';
  import CardThumbnail from './HybridLearningContentCard/CardThumbnail';

  export default {
    name: 'HybridLearningLessonCard',
    components: {
      CardThumbnail,
      TextTruncator,
      LearningActivityLabel,
      ProgressBar,
    },
    mixins: [commonLearnStrings, commonCoreStrings],
    props: {
      content: {
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
    },
    computed: {
      maxTitleHeight() {
        return 40;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  $margin: 24px;

  .drop-shadow {
    @extend %dropshadow-1dp;

    &:hover {
      @extend %dropshadow-4dp;
    }
  }

  .card {
    position: relative;
    display: inline-block;
    width: 100%;
    height: 156px;
    vertical-align: top;
    border-radius: 8px;
    transition: box-shadow $core-time ease;

    &:focus {
      outline-width: 4px;
      outline-offset: 6px;
    }
  }

  .title {
    max-width: 80%;
    margin: 4px 0 0 $margin;
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
    margin-right: $margin;
    margin-left: $margin;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    padding-right: $margin;
    padding-left: $margin;
    margin-top: $margin;
  }

  .learning-activity-label {
    position: absolute;
    top: $margin;
    right: $margin;
  }

  .mobile-card.card {
    width: 100%;
    height: 156px;
  }

  .mobile-card {
    .thumbnail {
      margin-left: $margin;
    }

    .card-thumbnail-wrapper {
      height: 60px;
      margin-top: 16px;
    }
  }

</style>
