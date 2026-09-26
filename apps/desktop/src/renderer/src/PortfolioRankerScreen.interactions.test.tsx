/* @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PortfolioRankerScreen } from './PortfolioRankerScreen';

afterEach(cleanup);

describe('PortfolioRankerScreen filters', () => {
  it('combines search, thesis, and idea status filters', () => {
    render(<PortfolioRankerScreen storageClient={null} />);

    const ideas = within(
      screen.getByRole('region', { name: 'Investment ideas' })
    );
    const search = screen.getByLabelText('Search ideas');
    const thesisFilter = screen.getByLabelText('Example thesis status');
    const statusFilter = screen.getByLabelText('Example idea status');

    fireEvent.change(search, { target: { value: 'AI' } });
    fireEvent.change(thesisFilter, { target: { value: 'Strong' } });
    fireEvent.change(statusFilter, { target: { value: 'Active' } });

    expect(ideas.getByText('NVDA')).toBeTruthy();
    expect(ideas.queryByText('AVGO')).toBeNull();

    fireEvent.change(thesisFilter, { target: { value: 'Improving' } });

    expect(ideas.getByText('AVGO')).toBeTruthy();
    expect(ideas.queryByText('NVDA')).toBeNull();

    fireEvent.change(search, { target: { value: 'no-such-idea' } });

    expect(
      ideas.getByText(
        'No matching ideas. Try another ticker, company, theme, or status.'
      )
    ).toBeTruthy();
  });

  it.each([
    'NVDA',
    'NVIDIA',
    'AI Infrastructure',
    'Strong thesis',
    'High conviction',
    'Medium risk'
  ])('searches idea metadata using "%s"', (query) => {
    render(<PortfolioRankerScreen storageClient={null} />);

    fireEvent.change(screen.getByLabelText('Search ideas'), {
      target: { value: query }
    });

    const ideas = within(
      screen.getByRole('region', { name: 'Investment ideas' })
    );
    expect(ideas.getByText('NVDA')).toBeTruthy();
  });
});

describe('PortfolioRankerScreen editor', () => {
  it('discards a draft on Cancel and applies it on Save changes', async () => {
    render(<PortfolioRankerScreen storageClient={null} />);

    const ideas = within(
      screen.getByRole('region', { name: 'Investment ideas' })
    );
    const actionMenu = ideas.getByLabelText('More actions for NVDA');
    const actionMenuDetails = actionMenu.closest('details') as HTMLDetailsElement;

    fireEvent.click(actionMenu);
    expect(actionMenuDetails.open).toBe(true);

    fireEvent.click(
      ideas.getAllByRole('button', { name: 'Edit details' })[0]
    );
    let editor = within(
      screen.getByRole('region', { name: 'Edit NVDA details' })
    );
    fireEvent.change(editor.getByLabelText('Company name 1'), {
      target: { value: 'Draft company name' }
    });
    fireEvent.click(editor.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.queryByRole('region', { name: 'Edit NVDA details' })
    ).toBeNull();
    expect(ideas.getByText('NVIDIA')).toBeTruthy();
    expect(ideas.queryByText('Draft company name')).toBeNull();

    fireEvent.click(
      ideas.getAllByRole('button', { name: 'Edit details' })[0]
    );
    editor = within(
      screen.getByRole('region', { name: 'Edit NVDA details' })
    );
    fireEvent.change(editor.getByLabelText('Company name 1'), {
      target: { value: 'NVIDIA Systems' }
    });
    fireEvent.click(editor.getByRole('button', { name: 'Save changes' }));

    expect(
      screen.queryByRole('region', { name: 'Edit NVDA details' })
    ).toBeNull();
    expect(ideas.getByText('NVIDIA Systems')).toBeTruthy();
  });
});
