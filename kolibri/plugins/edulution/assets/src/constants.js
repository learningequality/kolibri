import {
  PageNames as LearnPageNames,
  PageModes as LearnPageModes,
  RecommendedPages as LearnRecommendedPage,
  ClassesPageNames as LearnClassesPageNames,
  pageNameToModuleMap as learnPageNameToModuleMap,
} from '../../../learn/assets/src/constants';

export const PageNames = {
  ...LearnPageNames,
  KNOWLEDGE_MAP: 'KNOWLEDGE_MAP',
};

export const PageModes = LearnPageModes;

export const RecommendedPages = LearnRecommendedPage;

export const ClassesPageNames = LearnClassesPageNames;

export const pageNameToModuleMap = {
  ...learnPageNameToModuleMap,
  [PageNames.KNOWLEDGE_MAP]: 'topicsTree',
};
