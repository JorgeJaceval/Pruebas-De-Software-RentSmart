import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

const fetchMock = jest.fn<typeof fetch>();
const available = () => ({
  ok: true,
  json: async () => ({ status: 'ok', database: 'connected' }),
}) as Response;

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

describe('Inicio de RentSmart', () => {
  it('confirma disponibilidad cuando la API y la base de datos responden', async () => {
    fetchMock.mockResolvedValue(available());
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Un espacio.');
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '#registro');
    expect(screen.getByRole('form', { name: 'Crear cuenta' })).toBeInTheDocument();
    expect(await screen.findByText('Servicio disponible')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/health/ready', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('permite volver a comprobar después de un error de conexión', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(<App />);
    const retry = await screen.findByRole('button', { name: 'Volver a comprobar' });
    expect(screen.getByText('No pudimos conectar con el servicio')).toBeInTheDocument();
    fetchMock.mockResolvedValueOnce(available());
    await userEvent.click(retry);
    expect(await screen.findByText('Servicio disponible')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Volver a comprobar' })).not.toBeInTheDocument();
  });

  it('muestra indisponibilidad cuando PostgreSQL falla', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 } as Response);
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Volver a comprobar' })).toBeInTheDocument();
  });

  it('rechaza una respuesta que no confirme el estado de la base de datos', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) } as Response);
    render(<App />);
    expect(await screen.findByText('No pudimos conectar con el servicio')).toBeInTheDocument();
  });
});
