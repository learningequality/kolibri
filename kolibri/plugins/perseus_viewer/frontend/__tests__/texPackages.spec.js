import { TEX_PACKAGES } from 'kolibri-common/components/SafeMarkdown/tex';
import { texInputConfig } from '@khanacademy/mathjax-renderer/dist/tex-input-config';

describe('SafeMarkdown TeX configuration', () => {
  it('uses the same TeX packages as Perseus', () => {
    expect(TEX_PACKAGES).toEqual(texInputConfig.packages);
  });
});
