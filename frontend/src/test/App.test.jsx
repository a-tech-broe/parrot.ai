import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App', () => {
  it('renders the upload view by default', () => {
    render(<App />)
    expect(screen.getByText(/listen to any document/i)).toBeDefined()
  })

  it('shows the browse files button', () => {
    render(<App />)
    expect(screen.getByText(/browse files/i)).toBeDefined()
  })

  it('displays the Parrot logo text', () => {
    render(<App />)
    expect(screen.getByText('maibaaki — parrot')).toBeDefined()
  })

  it('shows supported formats in the drop zone', () => {
    render(<App />)
    expect(screen.getByText(/PDF/)).toBeDefined()
  })
})
