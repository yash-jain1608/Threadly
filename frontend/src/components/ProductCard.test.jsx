import { render, screen } from '@testing-library/react'; import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext.jsx'; import ProductCard from './ProductCard.jsx';
it('shows title, price and sold-out badge', () => {
  render(<MemoryRouter><AppProvider><ProductCard p={{ _id: '1', title: 'Test Tee', price: 999, mrp: 1999, images: [], stock: 0 }} /></AppProvider></MemoryRouter>);
  expect(screen.getAllByText('Test Tee').length).toBeGreaterThan(0); expect(screen.getByText('₹999')).toBeTruthy(); expect(screen.getByText('Sold out')).toBeTruthy();
});
