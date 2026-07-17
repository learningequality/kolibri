import { getCategoryIcon } from '../categoryIcon';

describe('getCategoryIcon', () => {
  describe('top-level special cases', () => {
    it('maps WORK to skillsResource', () => {
      expect(getCategoryIcon('WORK')).toBe('skillsResource');
    });

    it('maps FOUNDATIONS to basicSkillsResource', () => {
      expect(getCategoryIcon('FOUNDATIONS')).toBe('basicSkillsResource');
    });
  });

  describe('icon name mismatches', () => {
    it('maps LANGUAGE_LEARNING to language', () => {
      expect(getCategoryIcon('LANGUAGE_LEARNING')).toBe('language');
    });

    it('maps FOUNDATIONS_LOGIC_AND_CRITICAL_THINKING to logicCriticalThinkingResource', () => {
      expect(getCategoryIcon('FOUNDATIONS_LOGIC_AND_CRITICAL_THINKING')).toBe(
        'logicCriticalThinkingResource',
      );
    });

    it('maps LOGIC_AND_CRITICAL_THINKING to logicCriticalThinkingResource', () => {
      expect(getCategoryIcon('LOGIC_AND_CRITICAL_THINKING')).toBe('logicCriticalThinkingResource');
    });
  });

  describe('WORK subcategories → skillsResource', () => {
    it.each([
      'PROFESSIONAL_SKILLS',
      'TECHNICAL_AND_VOCATIONAL_TRAINING',
      'TOOLS_AND_SOFTWARE_TRAINING',
      'INDUSTRY_AND_SECTOR_SPECIFIC',
      'SKILLS_TRAINING',
    ])('maps %s to skillsResource', key => {
      expect(getCategoryIcon(key)).toBe('skillsResource');
    });
  });

  describe('MATHEMATICS subcategories → mathematicsResource', () => {
    it.each(['ALGEBRA', 'ARITHMETIC', 'CALCULUS', 'GEOMETRY', 'STATISTICS'])(
      'maps %s to mathematicsResource',
      key => {
        expect(getCategoryIcon(key)).toBe('mathematicsResource');
      },
    );
  });

  describe('SCIENCES subcategories → sciencesResource', () => {
    it.each(['ASTRONOMY', 'BIOLOGY', 'CHEMISTRY', 'EARTH_SCIENCE', 'PHYSICS'])(
      'maps %s to sciencesResource',
      key => {
        expect(getCategoryIcon(key)).toBe('sciencesResource');
      },
    );
  });

  describe('ARTS subcategories → artsResource', () => {
    it.each(['DANCE', 'DRAMA', 'MUSIC', 'VISUAL_ART'])('maps %s to artsResource', key => {
      expect(getCategoryIcon(key)).toBe('artsResource');
    });
  });

  describe('COMPUTER_SCIENCE subcategories → computerScienceResource', () => {
    it.each(['MECHANICAL_ENGINEERING', 'PROGRAMMING', 'WEB_DESIGN'])(
      'maps %s to computerScienceResource',
      key => {
        expect(getCategoryIcon(key)).toBe('computerScienceResource');
      },
    );
  });

  describe('READING_AND_WRITING subcategories → readingAndWritingResource', () => {
    it.each(['LITERATURE', 'READING_COMPREHENSION', 'WRITING'])(
      'maps %s to readingAndWritingResource',
      key => {
        expect(getCategoryIcon(key)).toBe('readingAndWritingResource');
      },
    );
  });

  describe('SOCIAL_SCIENCES subcategories → socialSciencesResource', () => {
    it.each(['ANTHROPOLOGY', 'CIVIC_EDUCATION', 'POLITICAL_SCIENCE', 'SOCIOLOGY'])(
      'maps %s to socialSciencesResource',
      key => {
        expect(getCategoryIcon(key)).toBe('socialSciencesResource');
      },
    );
  });

  describe('standard pattern (categories with matching KDS icons)', () => {
    it.each([
      ['SCHOOL', 'schoolResource'],
      ['DAILY_LIFE', 'dailyLifeResource'],
      ['MATHEMATICS', 'mathematicsResource'],
      ['SCIENCES', 'sciencesResource'],
      ['ARTS', 'artsResource'],
      ['COMPUTER_SCIENCE', 'computerScienceResource'],
      ['READING_AND_WRITING', 'readingAndWritingResource'],
      ['SOCIAL_SCIENCES', 'socialSciencesResource'],
      ['HISTORY', 'historyResource'],
      ['FOR_TEACHERS', 'forTeachersResource'],
      ['GUIDES', 'guidesResource'],
      ['LESSON_PLANS', 'lessonPlansResource'],
      ['DIGITAL_LITERACY', 'digitalLiteracyResource'],
      ['LITERACY', 'literacyResource'],
      ['NUMERACY', 'numeracyResource'],
      ['LEARNING_SKILLS', 'learningSkillsResource'],
      ['CURRENT_EVENTS', 'currentEventsResource'],
      ['DIVERSITY', 'diversityResource'],
      ['ENTREPRENEURSHIP', 'entrepreneurshipResource'],
      ['ENVIRONMENT', 'environmentResource'],
      ['FINANCIAL_LITERACY', 'financialLiteracyResource'],
      ['MEDIA_LITERACY', 'mediaLiteracyResource'],
      ['MENTAL_HEALTH', 'mentalHealthResource'],
      ['PUBLIC_HEALTH', 'publicHealthResource'],
    ])('maps %s to %s', (key, expected) => {
      expect(getCategoryIcon(key)).toBe(expected);
    });
  });
});
