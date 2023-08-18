<template>

  <div>
    <KGrid
      :class="selectedAnswerStyle"
    >
      <KGridItem
        :layout12="{ span: 6 }"
      >
        <div
          class="display-flex"
        >
          <p
            class="rounded-circle"
            :style="activeOptionRoundedColor"
            @click="isOptionSelected(optionId)"
          >
            <slot
              name="optionId"
            >
            </slot>
          </p>
          <p class="option-text-size">
            <slot
              name="answerSection"
            >
            </slot>
          </p>
        </div>
      </KGridItem>
      <KGridItem
        :layout12="{ span: 6 }"
      >
        <div class="float-item-left-style">
          <KGrid>
            <KGridItem
              :layout12="{ span: 3 }"
            >
              <KIcon class="icon-size" icon="edit" />
            </KGridItem>

            <KGridItem
              :layout12="{ span: 3 }"
            >
              <KIcon class="icon-size" icon="chevronDown" />
            </KGridItem>
            <KGridItem
              :layout12="{ span: 3 }"
            >
              <KIcon class="icon-size" icon="chevronUp" />
            </KGridItem>

            <KGridItem
              :layout12="{ span: 3 }"
            >
              <KIcon class="icon-size" icon="clear" />
            </KGridItem>
          </KGrid>
        </div>
      </KGridItem>
    </KGrid>
  </div>

</template>


<script>

  export default {
    name: 'AnswerOption',
    props: {
      optionId: {
        type: Number,
        required: true,
      },
      isOptionSelected: {
        type: Function,
        required: false,
        default: null,
      },
      isAnswerSelected: {
        type: Boolean,
        required: true,
      },
    },
    data() {
      return {
        activeColor: '#388E3C',
      };
    },
    computed: {
      selectedAnswerStyle() {
        if (this.isAnswerSelected) {
          return {
            'question-row-active': true,
          };
        } else {
          return {
            'question-row': true,
          };
        }
      },
      activeOptionRoundedColor() {
        if (this.isAnswerSelected) {
          return {
            backgroundColor: this.activeColor,
            color: 'white',
          };
        } else {
          return {};
        }
      },
    },
  };

</script>


<style scoped>
  .icon-size{
      width:24px;
      height:24px;
  }
  .rounded-circle{
      border:1px solid #616161;
      border-radius:24px;
      width:24px;
      height:24px;
      text-align: center;
      margin-right:10px;
      margin-left: 10px;
  }

  .display-flex{
      display: inline-flex;
  }

  .option-text-size{
      font-size:14px;
      margin-top: 16px;
  }

  .float-item-left-style{
      float:right;
      margin-top:10px;
      margin-right:10px;
  }

  .question-row {
    background-color: #fafafa;
    border:1px solid #DEDEDE ;
    border-radius:4px;
    margin-top:2px;
    margin-bottom:2px;
    height:52px;
  }

  .question-row-active {
    background-color: #fafafa;
    border:1px solid #388E3C ;
    border-radius:4px;
    margin-top:2px;
    margin-bottom:2px;
    height:52px;
  }

</style>
