import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('renders navigation', () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>,
    )
    expect(screen.getByText(/CollabSphere/)).toBeInTheDocument()
  })
})
