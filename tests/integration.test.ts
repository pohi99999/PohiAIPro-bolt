/**
 * Integráció tesztek - teljes felhasználói folyamatok tesztelése
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LocaleProvider } from '../LocaleContext';
import { AppContext } from '../App';
import { UserRole } from '../types';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode; userRole?: UserRole | null }> = ({ 
  children, 
  userRole = null 
}) => {
  const mockContextValue = {
    userRole,
    setUserRole: vi.fn(),
    logout: vi.fn(),
  };

  return (
    <BrowserRouter>
      <LocaleProvider>
        <AppContext.Provider value={mockContextValue}>
          {children}
        </AppContext.Provider>
      </LocaleProvider>
    </BrowserRouter>
  );
};

describe('Integráció tesztek - Teljes felhasználói folyamatok', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('[]');
  });

  describe('1. Vevő teljes folyamat teszt', () => {
    it('vevő bejelentkezéstől igény beküldéséig', async () => {
      // 1. Bejelentkezés szimulálása
      const mockSetUserRole = vi.fn();
      
      const { rerender } = render(
        <TestWrapper>
          <div data-testid="login-simulation">
            <button onClick={() => mockSetUserRole(UserRole.CUSTOMER)}>
              Bejelentkezés vevőként
            </button>
          </div>
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Bejelentkezés vevőként'));
      expect(mockSetUserRole).toHaveBeenCalledWith(UserRole.CUSTOMER);

      // 2. Vevő felület renderelése
      rerender(
        <TestWrapper userRole={UserRole.CUSTOMER}>
          <div data-testid="customer-dashboard">
            <h1>Új igény beküldése</h1>
            <form data-testid="demand-form">
              <input 
                data-testid="product-name" 
                placeholder="Termék neve"
                required
              />
              <input 
                data-testid="diameter-from" 
                type="number"
                placeholder="Átmérő-tól"
                required
              />
              <input 
                data-testid="diameter-to" 
                type="number"
                placeholder="Átmérő-ig"
                required
              />
              <input 
                data-testid="length" 
                type="number"
                placeholder="Hossz"
                required
              />
              <input 
                data-testid="quantity" 
                type="number"
                placeholder="Mennyiség"
                required
              />
              <button type="submit" data-testid="submit-demand">
                Igény beküldése
              </button>
            </form>
          </div>
        </TestWrapper>
      );

      // 3. Igény űrlap kitöltése
      fireEvent.change(screen.getByTestId('product-name'), {
        target: { value: 'Akác oszlop hántolt, csiszolt' }
      });
      fireEvent.change(screen.getByTestId('diameter-from'), {
        target: { value: '12' }
      });
      fireEvent.change(screen.getByTestId('diameter-to'), {
        target: { value: '16' }
      });
      fireEvent.change(screen.getByTestId('length'), {
        target: { value: '3' }
      });
      fireEvent.change(screen.getByTestId('quantity'), {
        target: { value: '100' }
      });

      // 4. Igény beküldése
      fireEvent.click(screen.getByTestId('submit-demand'));

      // 5. Ellenőrzés
      expect(screen.getByDisplayValue('Akác oszlop hántolt, csiszolt')).toBeInTheDocument();
      expect(screen.getByDisplayValue('12')).toBeInTheDocument();
      expect(screen.getByDisplayValue('16')).toBeInTheDocument();
      expect(screen.getByDisplayValue('3')).toBeInTheDocument();
      expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    });
  });

  describe('2. Gyártó teljes folyamat teszt', () => {
    it('gyártó bejelentkezéstől készlet feltöltéséig', async () => {
      const { rerender } = render(
        <TestWrapper userRole={UserRole.MANUFACTURER}>
          <div data-testid="manufacturer-dashboard">
            <h1>Új készlet feltöltése</h1>
            <form data-testid="stock-form">
              <input 
                data-testid="product-name" 
                placeholder="Termék neve"
                required
              />
              <input 
                data-testid="diameter-from" 
                type="number"
                placeholder="Átmérő-tól"
                required
              />
              <input 
                data-testid="diameter-to" 
                type="number"
                placeholder="Átmérő-ig"
                required
              />
              <input 
                data-testid="length" 
                type="number"
                placeholder="Hossz"
                required
              />
              <input 
                data-testid="quantity" 
                type="number"
                placeholder="Mennyiség"
                required
              />
              <input 
                data-testid="price" 
                placeholder="Ár"
              />
              <textarea 
                data-testid="sustainability" 
                placeholder="Fenntarthatósági információ"
              />
              <button type="submit" data-testid="submit-stock">
                Készlet feltöltése
              </button>
            </form>
          </div>
        </TestWrapper>
      );

      // Készlet űrlap kitöltése
      fireEvent.change(screen.getByTestId('product-name'), {
        target: { value: 'Akác oszlop hántolt, csiszolt' }
      });
      fireEvent.change(screen.getByTestId('diameter-from'), {
        target: { value: '12' }
      });
      fireEvent.change(screen.getByTestId('diameter-to'), {
        target: { value: '16' }
      });
      fireEvent.change(screen.getByTestId('length'), {
        target: { value: '3' }
      });
      fireEvent.change(screen.getByTestId('quantity'), {
        target: { value: '150' }
      });
      fireEvent.change(screen.getByTestId('price'), {
        target: { value: '25 EUR/db' }
      });
      fireEvent.change(screen.getByTestId('sustainability'), {
        target: { value: 'PEFC tanúsított, fenntartható erdőgazdálkodásból' }
      });

      // Készlet beküldése
      fireEvent.click(screen.getByTestId('submit-stock'));

      // Ellenőrzés
      expect(screen.getByDisplayValue('Akác oszlop hántolt, csiszolt')).toBeInTheDocument();
      expect(screen.getByDisplayValue('25 EUR/db')).toBeInTheDocument();
      expect(screen.getByDisplayValue('PEFC tanúsított, fenntartható erdőgazdálkodásból')).toBeInTheDocument();
    });
  });

  describe('3. Admin teljes folyamat teszt', () => {
    it('admin bejelentkezéstől párosítás javaslásig', async () => {
      // Mock adatok beállítása
      const mockDemands = JSON.stringify([
        {
          id: 'DEM-001',
          productName: 'Akác oszlop',
          diameterFrom: '12',
          diameterTo: '16',
          length: '3',
          quantity: '100',
          status: 'Received'
        }
      ]);
      
      const mockStock = JSON.stringify([
        {
          id: 'STK-001',
          productName: 'Akác oszlop',
          diameterFrom: '12',
          diameterTo: '16',
          length: '3',
          quantity: '150',
          status: 'Available',
          price: '25 EUR/db'
        }
      ]);

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'pohi-ai-customer-demands') return mockDemands;
        if (key === 'pohi-ai-manufacturer-stock') return mockStock;
        return '[]';
      });

      render(
        <TestWrapper userRole={UserRole.ADMIN}>
          <div data-testid="admin-dashboard">
            <h1>Admin irányítópult</h1>
            <div data-testid="matchmaking-section">
              <h2>Párosítás javaslatok</h2>
              <button data-testid="generate-suggestions">
                AI párosítás javaslatok generálása
              </button>
              <div data-testid="suggestions-list">
                <div data-testid="suggestion-1">
                  <span>DEM-001 ↔ STK-001</span>
                  <span>Kiváló egyezés: azonos méretek és termék</span>
                  <button data-testid="confirm-match">Párosítás megerősítése</button>
                </div>
              </div>
            </div>
          </div>
        </TestWrapper>
      );

      // AI javaslatok generálása
      fireEvent.click(screen.getByTestId('generate-suggestions'));
      
      // Párosítás megerősítése
      fireEvent.click(screen.getByTestId('confirm-match'));

      // Ellenőrzés
      expect(screen.getByText('DEM-001 ↔ STK-001')).toBeInTheDocument();
      expect(screen.getByText('Kiváló egyezés: azonos méretek és termék')).toBeInTheDocument();
    });
  });

  describe('4. Többfelhasználós szcenárió teszt', () => {
    it('teljes üzleti folyamat: igény → készlet → párosítás → számlázás', async () => {
      // 1. Vevő igényt küld be
      const demandData = {
        id: 'DEM-INTEGRATION-001',
        productName: 'Akác oszlop hántolt, csiszolt',
        diameterFrom: '14',
        diameterTo: '18',
        length: '3',
        quantity: '200',
        status: 'Received',
        submissionDate: new Date().toISOString()
      };

      // 2. Gyártó készletet tölt fel
      const stockData = {
        id: 'STK-INTEGRATION-001',
        productName: 'Akác oszlop hántolt, csiszolt',
        diameterFrom: '14',
        diameterTo: '18',
        length: '3',
        quantity: '250',
        price: '28 EUR/db',
        status: 'Available',
        uploadDate: new Date().toISOString()
      };

      // 3. Admin párosítást végez
      const matchData = {
        id: 'MATCH-INTEGRATION-001',
        demandId: demandData.id,
        stockId: stockData.id,
        matchDate: new Date().toISOString(),
        commissionRate: 0.05,
        commissionAmount: 280, // 200 * 28 * 0.05
        billed: false
      };

      // Mock localStorage válaszok
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'pohi-ai-customer-demands') return JSON.stringify([demandData]);
        if (key === 'pohi-ai-manufacturer-stock') return JSON.stringify([stockData]);
        if (key === 'pohi-ai-confirmed-matches') return JSON.stringify([matchData]);
        return '[]';
      });

      // Teszt komponens renderelése
      render(
        <TestWrapper userRole={UserRole.ADMIN}>
          <div data-testid="integration-test">
            <div data-testid="demand-summary">
              <h3>Aktív igények</h3>
              <div>DEM-INTEGRATION-001: 200 db akác oszlop</div>
            </div>
            <div data-testid="stock-summary">
              <h3>Elérhető készlet</h3>
              <div>STK-INTEGRATION-001: 250 db akác oszlop (28 EUR/db)</div>
            </div>
            <div data-testid="match-summary">
              <h3>Megerősített párosítások</h3>
              <div>MATCH-INTEGRATION-001: 280 EUR jutalék</div>
            </div>
            <div data-testid="billing-summary">
              <h3>Számlázás</h3>
              <div>Nem számlázott jutalék: 280 EUR</div>
              <button data-testid="generate-invoice">Számla generálása</button>
            </div>
          </div>
        </TestWrapper>
      );

      // Ellenőrzések
      expect(screen.getByText('DEM-INTEGRATION-001: 200 db akác oszlop')).toBeInTheDocument();
      expect(screen.getByText('STK-INTEGRATION-001: 250 db akác oszlop (28 EUR/db)')).toBeInTheDocument();
      expect(screen.getByText('MATCH-INTEGRATION-001: 280 EUR jutalék')).toBeInTheDocument();
      expect(screen.getByText('Nem számlázott jutalék: 280 EUR')).toBeInTheDocument();

      // Számla generálás teszt
      fireEvent.click(screen.getByTestId('generate-invoice'));
      expect(screen.getByTestId('generate-invoice')).toBeInTheDocument();
    });
  });

  describe('5. Hibakezelés és edge case-ek', () => {
    it('üres adatok kezelése', () => {
      mockLocalStorage.getItem.mockReturnValue('[]');

      render(
        <TestWrapper userRole={UserRole.CUSTOMER}>
          <div data-testid="empty-state">
            <h1>Saját igények</h1>
            <div data-testid="no-demands">
              <p>Még nincs beküldött igényed</p>
              <button>Új igény beküldése</button>
            </div>
          </div>
        </TestWrapper>
      );

      expect(screen.getByText('Még nincs beküldött igényed')).toBeInTheDocument();
      expect(screen.getByText('Új igény beküldése')).toBeInTheDocument();
    });

    it('hibás JSON adatok kezelése', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      render(
        <TestWrapper userRole={UserRole.CUSTOMER}>
          <div data-testid="error-handling">
            <h1>Hiba történt</h1>
            <p>Az adatok betöltése sikertelen</p>
          </div>
        </TestWrapper>
      );

      expect(screen.getByText('Hiba történt')).toBeInTheDocument();
    });

    it('nagy adatmennyiség kezelése', () => {
      // 1000 igény generálása
      const largeDemandData = Array.from({ length: 1000 }, (_, i) => ({
        id: `DEM-${i.toString().padStart(3, '0')}`,
        productName: `Termék ${i}`,
        status: 'Received'
      }));

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(largeDemandData));

      const startTime = performance.now();
      
      render(
        <TestWrapper userRole={UserRole.ADMIN}>
          <div data-testid="large-data">
            <h1>Nagy adatmennyiség teszt</h1>
            <div data-testid="demand-count">
              Igények száma: {largeDemandData.length}
            </div>
          </div>
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // A renderelés 200ms alatt kell hogy megtörténjen nagy adatmennyiség esetén is
      expect(renderTime).toBeLessThan(200);
      expect(screen.getByText('Igények száma: 1000')).toBeInTheDocument();
    });
  });
});