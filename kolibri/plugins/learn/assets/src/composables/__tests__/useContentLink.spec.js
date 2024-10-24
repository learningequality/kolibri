import { Store } from 'vuex';
import { validateLinkObject } from 'kolibri/utils/validators';
import { PageNames } from '../../../src/constants';
import useContentLink from '../useContentLink';

const name = 'test';
const query = {
  keyword: 'word',
  prevName: 'notatest',
  prevParams: encodeURI(JSON.stringify({ id: 'id' })),
  prevQuery: encodeURI(JSON.stringify({ search: 'this' })),
};
const params = { lesson: 'that' };

const store = new Store({
  state: {
    route: {
      name,
      params,
      query,
    },
  },
});

const { genContentLinkBackLinkCurrentPage, genContentLinkKeepCurrentBackLink } =
  useContentLink(store);

describe('genContentLinkBackLinkCurrentPage', () => {
  const topicLink = genContentLinkBackLinkCurrentPage(19, false);
  const contentLink = genContentLinkBackLinkCurrentPage(88, true);

  describe('generating for a topic (isLeaf != true)', () => {
    it('returns a valid link object', () => {
      expect(validateLinkObject(topicLink)).toBeTruthy();
    });

    it('returns an object with name pointing to PageName.TOPICS_TOPIC', () => {
      expect(topicLink.name).toEqual(PageNames.TOPICS_TOPIC);
    });

    it('returns a params object with the passed id', () => {
      expect(topicLink.params.id).toEqual(19);
    });

    it('encodes params object in the query parameters', () => {
      expect(topicLink.query.prevParams).toEqual(encodeURI(JSON.stringify(params)));
    });

    it('encodes query object in the query parameters', () => {
      expect(topicLink.query.prevQuery).toEqual(encodeURI(JSON.stringify(query)));
    });

    it('encodes name in the query parameters', () => {
      expect(topicLink.query.prevName).toEqual(name);
    });
  });

  describe('generating for a topic (isLeaf == true)', () => {
    it('returns a valid link object', () => {
      expect(validateLinkObject(contentLink)).toBeTruthy();
    });

    it('returns an object with name pointing to PageName.TOPICS_CONTENT', () => {
      expect(contentLink.name).toEqual(PageNames.TOPICS_CONTENT);
    });

    it('returns a params object with the passed id', () => {
      expect(contentLink.params.id).toEqual(88);
    });

    it('encodes params object in the query parameters', () => {
      expect(contentLink.query.prevParams).toEqual(encodeURI(JSON.stringify(params)));
    });

    it('encodes query object in the query parameters', () => {
      expect(contentLink.query.prevQuery).toEqual(encodeURI(JSON.stringify(query)));
    });

    it('encodes name in the query parameters', () => {
      expect(contentLink.query.prevName).toEqual(name);
    });
  });
});

describe('genContentLinkKeepCurrentBackLink', () => {
  const topicLink = genContentLinkKeepCurrentBackLink(19, false);
  const contentLink = genContentLinkKeepCurrentBackLink(88, true);

  describe('generating for a topic (isLeaf != true)', () => {
    it('returns a valid link object', () => {
      expect(validateLinkObject(topicLink)).toBeTruthy();
    });

    it('returns an object with name pointing to PageName.TOPICS_TOPIC', () => {
      expect(topicLink.name).toEqual(PageNames.TOPICS_TOPIC);
    });

    it('returns a params object with the passed id', () => {
      expect(topicLink.params.id).toEqual(19);
    });

    it('encodes params object in the query parameters', () => {
      expect(topicLink.query.prevParams).toEqual(query.prevParams);
    });

    it('encodes query object in the query parameters', () => {
      expect(topicLink.query.prevQuery).toEqual(query.prevQuery);
    });

    it('encodes name in the query parameters', () => {
      expect(topicLink.query.prevName).toEqual(query.prevName);
    });
  });

  describe('generating for a topic (isLeaf == true)', () => {
    it('returns a valid link object', () => {
      expect(validateLinkObject(contentLink)).toBeTruthy();
    });

    it('returns an object with name pointing to PageName.TOPICS_CONTENT', () => {
      expect(contentLink.name).toEqual(PageNames.TOPICS_CONTENT);
    });

    it('returns a params object with the passed id', () => {
      expect(contentLink.params.id).toEqual(88);
    });

    it('encodes params object in the query parameters', () => {
      expect(contentLink.query.prevParams).toEqual(query.prevParams);
    });

    it('encodes query object in the query parameters', () => {
      expect(contentLink.query.prevQuery).toEqual(query.prevQuery);
    });

    it('encodes name in the query parameters', () => {
      expect(contentLink.query.prevName).toEqual(query.prevName);
    });
  });
});
