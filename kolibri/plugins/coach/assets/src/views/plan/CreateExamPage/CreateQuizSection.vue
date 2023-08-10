<template>
    <div>
        <KGrid>
          <KGridItem 
            :layout4="{ span : 1}"
            :layout8="{ span: 1 }"
            :layout12="{ span: 1 }">
              <KIcon 
                icon="quiz"
                class="style_icon"
              />
          </KGridItem>

          <KGridItem
            :layout4="{ span : 3}"
            :layout8="{ span: 7 }"
            :layout12="{ span: 11 }">

              <KTextbox
                ref="title"
                :label="coachString('titleLabel')"
                :autofocus="true"
                :maxlength="100"
                class="text-box-style"
              />
          </KGridItem>
        </KGrid>

        <p>{{ $tr('addSectionsDescription') }}</p>

        <hr id="bottom-border"/>
        <br>

        <KGrid>
            <KGridItem 
            :layout12="{ span: 8 }"
            >
            <span class="active-section">
                {{ ($tr('sectionLabel')).toUpperCase() }}
            </span>
            </KGridItem>

            <KGridItem 
            :layout12="{ span : 4}"
            >
            <KButton
                class="add-section-button"
                appearance="flat-button"
                icon="plus">
                {{ ($tr('addSection')).toUpperCase() }}
            </KButton>
            </KGridItem>
        </KGrid>

        <hr id="bottom-border"/>
        
        
        <AccordionContainer
          v-if="isQuestionAvailable"
        />

        <div 
          v-else
          class="no-question-layout">
            <div class="question-mark-layout">
            <span id="help-icon-style">?</span>
            </div>

            <p class="no-question-style">{{ $tr('noQuestionsLabel') }}</p>

            <p>{{ $tr('selectResourceGuide') }}</p>

            <KButton 
              primary
              icon="plus"> 
              {{  $tr('addQuestion') }}
            </KButton>

        </div>
    </div>
   
</template>

<script>
import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
import commonCoach from '../../common';
import AccordionContainer from './AccordionContainer.vue';
export default {
  name:"CreateQuizSection",
  components:{
    AccordionContainer
  },
  mixins: [commonCoreStrings, commonCoach],
  data(){
    return {
      isQuestionAvailable:false,
    }
  },
  $trs: {
    sectionLabel:{
      message:"section 1",
      context:"Indicates the section number created",
    },
    addSection:{
      message:"add section",
      context:"Label for adding the number of quiz sections",
    },
    noQuestionsLabel:{
      message:"There are no questions in this section",
      context:"Indicates that there is no question in the particular section",
    },
    selectResourceGuide:{
      message:"To add questions, select resources from the available channels.",
      context:"Explains a way of adding a question",
    },
    addQuestion:{
      message:"Add Questions",
      context:"Button label for adding a new question",
    },
    addSectionsDescription:{
      message:"Add one or more sections to your quiz, according to your needs",
      context:"This message indicates that more than one section can be added when creating a quiz."
    }
  }
}
</script>

<style lang="scss"  scoped>

.style_icon{
    width:40px;
    height:40px;
    margin:20px;
}

 /deep/ .ui-textbox-label{
    width:902px;
  }
  
  #bottom-border{
    line-height: 1.2;
    color: #DEDEDE;
    margin-bottom:10px;
  }

  .no-question-layout{
    width: Fill (952px);
    height: Fill (265px);
    padding: 40px;
    border-radius: 10px;
    border: 1px;
    text-align: center;
    gap: 40px;
    background-color:#FAFAFA;
  }

  .question-mark-layout{
    margin:auto;
    width: 40px;
    height: 40px;
    background-color:#DBC3D4;
    align-items: center;
  }

  #help-icon-style{
    font-size: 24px;
    font-weight: 700;
    line-height: 34px;
    color:#996189;
  }

  .active-section{
    color:#996189;
    border-bottom:1px solid #996189;
  }

  .add-section-button{
    float: right;
    background-color:#F5F5F5;
  }

  .text-box-style{
    padding:15px;
    width:1000px;
  }
</style>