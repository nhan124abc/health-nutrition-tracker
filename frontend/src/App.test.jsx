import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import StatCard from './components/StatCard';

test('renders a dashboard statistic card', () => {
  render(<StatCard title="Calo nạp vào" value="1,540" helper="Mục tiêu 2,000 kcal" />);

  expect(screen.getByText(/calo nạp vào/i)).toBeInTheDocument();
  expect(screen.getByText(/1,540/i)).toBeInTheDocument();
});
