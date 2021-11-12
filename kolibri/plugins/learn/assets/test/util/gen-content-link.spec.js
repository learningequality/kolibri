import { validateLinkObject } from 'kolibri.utils.validators';
import { PageNames } from '../../src/constants';
import genContentLink from '../../src/utils/genContentLink';

const topicLink = genContentLink(19, null, false, null, {});
const contentLink = genContentLink(88, 1, true, null, {});

describe('genContentLink - generating for a topic (isLeaf != true)', () => {
  it('returns a valid link object', () => {
    expect(validateLinkObject(topicLink)).toBeTruthy();
  });

  it('returns an object with name pointing to PageName.TOPICS_TOPIC', () => {
    expect(topicLink.name).toEqual(PageNames.TOPICS_TOPIC);
  });

  it('returns a params object with the passed id', () => {
    expect(topicLink.params.id).toEqual(19);
  });
});

describe('genContentLink - generating for a topic (isLeaf == true)', () => {
  it('returns a valid link object', () => {
    expect(validateLinkObject(contentLink)).toBeTruthy();
  });

  it('returns an object with name pointing to PageName.TOPICS_CONTENT', () => {
    expect(contentLink.name).toEqual(PageNames.TOPICS_CONTENT);
  });

  it('returns a params object with the passed id', () => {
    expect(contentLink.params.id).toEqual(88);
  });
});
