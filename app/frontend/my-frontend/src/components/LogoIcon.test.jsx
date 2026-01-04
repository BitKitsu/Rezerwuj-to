import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import LogoIcon from './LogoIcon';

describe('LogoIcon', () => {
  it('renders logo image with expected attributes', () => {
    const { container } = render(<LogoIcon />);

    const img = container.querySelector('img');
    expect(img).toBeTruthy();

    expect(img).toHaveAttribute('src', '/icon-192.png');
    expect(img).toHaveAttribute('width', '28');
    expect(img).toHaveAttribute('height', '28');
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('aria-hidden', 'true');
  });
});
