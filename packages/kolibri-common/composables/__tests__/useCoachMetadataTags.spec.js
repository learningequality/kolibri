import { ref } from 'kolibri.lib.vueCompositionApi';
import { get, set } from '@vueuse/core';
import { useCoachMetadataTags } from '../useCoachMetadataTags';

describe('useCoachMetadataTags', () => {
  it('should return up to 7 tags for channels and folders', () => {
    const contentNode = {
      kind: 'CHANNEL',
      categories: ['Math', 'Science', 'History', 'Geography'],
      grade_levels: ['Beginner', 'Intermediate', 'Advanced'],
      lang: [{ lang_name: 'English' }, { lang_name: 'Spanish' }],
    };

    const { tags } = useCoachMetadataTags(contentNode); 

    const expectedTags = [
      'Math',
      'Science',
      'History',
      'Beginner',
      'Intermediate',
      'Advanced',
      'Multiple languages',
    ];
    expect(tags.value).toEqual(expectedTags);
});


  it('should return up to 3 tags for resources', () => {
    const contentNode = {
      kind: 'RESOURCE',
      activities: ['Reading', 'Writing'],
      duration: '30 minutes',
      grade_levels: ['Beginner', 'Intermediate'],
      categories: [{ specific: 'Chemistry' }, { specific: 'Physics' }],
      lang: [{ lang_name: 'English' }],
    };

    const { tags, setContentNode } = useCoachMetadataTags(contentNode);
    setContentNode(contentNode);

    expect(tags.value).toEqual([
      'multiple learning activities',
      '30 minutes',
      'Beginner',
      'Intermediate',
      'Chemistry',
      'Physics',
      'English',
    ]);
  });

  it('should handle missing metadata gracefully', () => {
    const contentNode = {
      kind: 'RESOURCE',
      activities: [],
      duration: '',
      grade_levels: [],
      categories: [],
      lang: [],
    };

    const { tags, setContentNode } = useCoachMetadataTags(contentNode);
    setContentNode(contentNode);

    expect(tags.value).toEqual([]);
  });
});