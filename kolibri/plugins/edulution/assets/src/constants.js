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

export const prefixToColourMap = {
  'pre-': {
    light: '#D7CCC8',
    dark: '#5D4037',
    accent: '#795548',
  },
  alpha: {
    light: '#C8E6C9',
    dark: '#388E3C',
    accent: '#4CAF50',
  },
  bravo: {
    light: '#C5CAE9',
    dark: '#303F9F',
    accent: '#3F51B5',
  },
  charlie: {
    light: '#F8BBD0',
    dark: '#C2185B',
    accent: '#E91E63',
  },
};
