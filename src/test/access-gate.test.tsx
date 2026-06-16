import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AccessGate } from '../app/AccessGate';
import { routes } from '../app/router';

const testAccessHash = 'd9bba04d7b1fe530f5b03041660d16e280e78e8a869c70c1eba04221cb4bbd04';

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
    ['dashboard', '/', /Swim Overview/i],
    ['conditions and risk', '/conditions-risk', /Stop Swim If/i],
    ['medical safety record', '/safety', /Medical Living Record/i],
    ['operating record', '/logs', /Operational swim source of truth/i],
    ['template project', '/template', /Reusable Template Project/i]
  ])('protects direct access to %s', async (_label, path, hiddenContent) => {
    renderProtectedRoute(path);

    expect(screen.getByRole('heading', { name: 'Swim California' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Enter access code/i)).toBeInTheDocument();
    expect(screen.queryByText(hiddenContent)).not.toBeInTheDocument();
  });

  it('unlocks the full site after the access code is entered', async () => {
    const user = userEvent.setup();
    renderProtectedRoute('/conditions-risk');

    await user.type(screen.getByLabelText(/Enter access code/i), 'correct-pass');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));

    expect(await screen.findByText('Stop Swim If')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Enter access code/i)).not.toBeInTheDocument();
  });
});
