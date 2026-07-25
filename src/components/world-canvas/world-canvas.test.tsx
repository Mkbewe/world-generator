import { render } from '@testing-library/react';

import { WorldCanvas } from './world-canvas';

describe('WorldCanvas', () => {
  it('should render successfully', () => {
    const { container } = render(<WorldCanvas />);
    expect(container).toBeTruthy();
  });
});
