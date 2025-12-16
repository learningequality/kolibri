import { ref } from 'vue';
import { get } from '@vueuse/core';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { ContentNodeKinds } from 'kolibri/constants';
import useQuizResources from '../useQuizResources.js';
import useFetchTree from '../useFetchTree.js';

jest.mock('../useFetchTree.js');
jest.mock('kolibri-common/apiResources/ContentNodeResource');

describe('useQuizResources', () => {
  // Sample test data
  const sampleResults = [
    {
      id: 'topic1',
      kind: ContentNodeKinds.TOPIC,
      title: 'Topic 1',
      children: ['exercise1', 'exercise2'],
    },
    {
      id: 'topic2',
      kind: ContentNodeKinds.TOPIC,
      title: 'Topic 2',
      children: ['exercise3'],
    },
    {
      id: 'exercise1',
      kind: ContentNodeKinds.EXERCISE,
      title: 'Exercise 1',
    },
  ];

  const descendantsResponse = {
    data: [
      { id: 'topic1', num_assessments: 2 },
      { id: 'topic2', num_assessments: 1 },
    ],
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock useFetchTree implementation
    useFetchTree.mockImplementation(() => ({
      topic: ref(null),
      fetchTree: jest.fn().mockResolvedValue(sampleResults),
      fetchMore: jest.fn().mockResolvedValue(sampleResults),
      hasMore: ref(true),
      loading: ref(false),
    }));

    // Mock ContentNodeResource.fetchDescendantsAssessments
    ContentNodeResource.fetchDescendantsAssessments.mockResolvedValue(descendantsResponse);
  });

  describe('initialization', () => {
    it('should initialize with correct parameters for practice quiz', () => {
      useQuizResources({ topicId: 'test-topic', practiceQuiz: true });

      expect(useFetchTree).toHaveBeenCalledWith({
        topicId: 'test-topic',
        params: {
          kind_in: [ContentNodeKinds.EXERCISE, ContentNodeKinds.TOPIC],
          include_coach_content: true,
          contains_quiz: true,
        },
      });
    });

    it('should initialize with correct parameters for regular quiz', () => {
      useQuizResources({ topicId: 'test-topic' });

      expect(useFetchTree).toHaveBeenCalledWith({
        topicId: 'test-topic',
        params: {
          kind_in: [ContentNodeKinds.EXERCISE, ContentNodeKinds.TOPIC],
          include_coach_content: true,
        },
      });
    });
  });

  describe('annotateTopicsWithDescendantCounts', () => {
    it('should annotate topics with correct assessment counts', async () => {
      const { annotateTopicsWithDescendantCounts } = useQuizResources();
      const result = await annotateTopicsWithDescendantCounts(sampleResults);

      // Verify the topics are properly annotated
      expect(result).toEqual([
        {
          ...sampleResults[0],
          num_assessments: 2,
        },
        {
          ...sampleResults[1],
          num_assessments: 1,
        },
        sampleResults[2], // Exercise remains unchanged
      ]);

      expect(ContentNodeResource.fetchDescendantsAssessments).toHaveBeenCalledWith([
        'topic1',
        'topic2',
      ]);
    });

    it('should filter out topics with no assessments', async () => {
      ContentNodeResource.fetchDescendantsAssessments.mockResolvedValue({
        data: [
          { id: 'topic1', num_assessments: 0 }, // No assessments
          { id: 'topic2', num_assessments: 1 },
        ],
      });

      const { annotateTopicsWithDescendantCounts } = useQuizResources();
      const result = await annotateTopicsWithDescendantCounts(sampleResults);

      expect(result).toEqual([
        {
          ...sampleResults[1],
          num_assessments: 1,
        },
        sampleResults[2], // Exercise remains unchanged
      ]);
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      ContentNodeResource.fetchDescendantsAssessments.mockRejectedValue(error);

      const { annotateTopicsWithDescendantCounts } = useQuizResources();
      const result = await annotateTopicsWithDescendantCounts(sampleResults);

      expect(result).toBeUndefined();
    });
  });

  describe('integration with fetch methods', () => {
    let quizResources;

    beforeEach(() => {
      quizResources = useQuizResources({ topicId: 'test-topic' });
    });

    it('should annotate fetched resources in fetchQuizResources', async () => {
      await quizResources.fetchQuizResources();

      // Check that resources have been annotated as expected
      expect(get(quizResources.resources)).toEqual([
        { ...sampleResults[0], num_assessments: 2 },
        { ...sampleResults[1], num_assessments: 1 },
        sampleResults[2],
      ]);

      // Verify that the API call to fetch descendant assessments was made with correct topic IDs
      expect(ContentNodeResource.fetchDescendantsAssessments).toHaveBeenCalledWith([
        'topic1',
        'topic2',
      ]);
    });

    it('should annotate fetched resources in fetchMoreQuizResources', async () => {
      // First, fetch the initial resources
      await quizResources.fetchQuizResources();
      const initialResources = get(quizResources.resources);

      // Then, fetch more resources and append them
      await quizResources.fetchMoreQuizResources();

      const expectedNewResources = [
        { ...sampleResults[0], num_assessments: 2 },
        { ...sampleResults[1], num_assessments: 1 },
        sampleResults[2],
      ];

      expect(get(quizResources.resources)).toEqual([...initialResources, ...expectedNewResources]);

      // Verify that the API call was made correctly during fetchMore as well
      expect(ContentNodeResource.fetchDescendantsAssessments).toHaveBeenCalledWith([
        'topic1',
        'topic2',
      ]);
    });
  });

  describe('fetchQuizResources', () => {
    it('should fetch and annotate resources', async () => {
      const { fetchQuizResources, resources } = useQuizResources();

      await fetchQuizResources();

      expect(get(resources)).toEqual([
        {
          ...sampleResults[0],
          num_assessments: 2,
        },
        {
          ...sampleResults[1],
          num_assessments: 1,
        },
        sampleResults[2],
      ]);
    });

    it('should manage loading state correctly', async () => {
      const { fetchQuizResources, loading } = useQuizResources();

      const loadingStates = [];
      loadingStates.push(get(loading));

      const fetchPromise = fetchQuizResources();
      loadingStates.push(get(loading));

      await fetchPromise;
      loadingStates.push(get(loading));

      expect(loadingStates).toEqual([false, true, false]);
    });
  });

  describe('fetchMoreQuizResources', () => {
    it('should fetch and append more annotated resources', async () => {
      const { fetchQuizResources, fetchMoreQuizResources, resources } = useQuizResources();

      await fetchQuizResources();
      const initialResources = get(resources);

      await fetchMoreQuizResources();

      const expectedNewResources = [
        {
          ...sampleResults[0],
          num_assessments: 2,
        },
        {
          ...sampleResults[1],
          num_assessments: 1,
        },
        sampleResults[2],
      ];

      expect(get(resources)).toEqual([...initialResources, ...expectedNewResources]);
    });

    it('should manage loading states correctly', async () => {
      const { fetchMoreQuizResources, loading, loadingMore } = useQuizResources();

      const states = [];
      states.push({ loading: get(loading), loadingMore: get(loadingMore) });

      const fetchPromise = fetchMoreQuizResources();
      states.push({ loading: get(loading), loadingMore: get(loadingMore) });

      await fetchPromise;
      states.push({ loading: get(loading), loadingMore: get(loadingMore) });

      expect(states).toEqual([
        { loading: false, loadingMore: false },
        { loading: true, loadingMore: true },
        { loading: false, loadingMore: false },
      ]);
    });
  });
});
