import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AccessGate } from '../app/AccessGate';
import { routes } from '../app/router';

const testAccessHash = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';

function renderProtectedRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return render(
    <AccessGate accessHash={testAccessHash} bypass={false}>
      <RouterProvider router={router} />
    </AccessGate>
  );
}

describe('site access gate', () => {
  it.each([
    ['observation log', '/', /WOWSA Observation Log/i],
    ['medical', '/medical', /Independent medical checklists/i],
    ['legacy WOWSA redirect', '/wowsa', /WOWSA Observation Log/i],
    ['template project', '/template', /Reusable Observer Template/i]
  ])('protects direct access to %s', async (_label, path, hiddenContent) => {
    renderProtectedRoute(path);

    expect(screen.getByRole('heading', { name: 'Swim California' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Enter access code/i)).toBeInTheDocument();
    expect(screen.queryByText(hiddenContent)).not.toBeInTheDocument();
  });

  it('unlocks the full site after the access code is entered', async () => {
    const user = userEvent.setup();
    renderProtectedRoute('/medical');

    await user.type(screen.getByLabelText(/Enter access code/i), '1234');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));

    expect(await screen.findByText('Recovery-Day Checklist')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Enter access code/i)).not.toBeInTheDocument();
  });
});
