import React from 'react';
import {createRoot} from 'react-dom/client';
import {MediaScore} from '../../src/components/MediaScore.jsx';

export function mountMediaScore(host, props) {
  const root = createRoot(host);
  root.render(<MediaScore {...props} />);
  return () => root.unmount();
}
