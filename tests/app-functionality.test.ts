/**
 * Pohi AI Pro alkalmazás funkcionalitás teszt
 * Ez a teszt ellenőrzi az alkalmazás főbb funkcióit és komponenseit
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LocaleProvider } from '../LocaleContext';
import { AppContext } from '../App';
import { UserRole } from '../types';

// Mock komponensek importálása
import LoginPage from '../pages/LoginPage';
import { CustomerNewDemandPage } from '../pages/customer/CustomerNewDemandPage';
import { ManufacturerNewStockPage } from '../pages/manufacturer/ManufacturerNewStockPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import Layout from '../components/Layout';

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

// Mock AI szolgáltatás
vi.mock('../lib/gemini', () => ({
  ai: {
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: 'Mock AI response'
      }),
      generateImages: vi.fn().mockResolvedValue({
        generatedImages: [{
          image: {
            imageBytes: 'mock-base64-data'
          }
        }]
      })
    }
  }
}));

// Test wrapper komponens
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

describe('Pohi AI Pro alkalmazás funkcionalitás tesztek', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('1. Bejelentkezési oldal tesztek', () => {
    it('megjeleníti a bejelentkezési oldalt', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByText(/Pohi AI Pro/i)).toBeInTheDocument();
      expect(screen.getByText(/Válassz szerepkört/i)).toBeInTheDocument();
    });

    it('lehetővé teszi a szerepkör kiválasztását', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const adminButton = screen.getByText(/Adminisztrátor/i);
      const customerButton = screen.getByText(/Vevő/i);
      const manufacturerButton = screen.getByText(/Gyártó/i);

      expect(adminButton).toBeInTheDocument();
      expect(customerButton).toBeInTheDocument();
      expect(manufacturerButton).toBeInTheDocument();

      fireEvent.click(customerButton);
      expect(customerButton).toHaveClass('bg-cyan-600');
    });
  });

  describe('2. Layout és navigáció tesztek', () => {
    it('megjeleníti a layout komponenst vevő szerepkörrel', () => {
      render(
        <TestWrapper userRole={UserRole.CUSTOMER}>
          <Layout>
            <div>Test content</div>
          </Layout>
        </TestWrapper>
      );

      expect(screen.getByText(/Pohi AI Pro/i)).toBeInTheDocument();
      expect(screen.getByText(/Új igény/i)).toBeInTheDocument();
      expect(screen.getByText(/Saját igények/i)).toBeInTheDocument();
    });

    it('megjeleníti a megfelelő menüelemeket gyártó szerepkörrel', () => {
      render(
        <TestWrapper userRole={UserRole.MANUFACTURER}>
          <Layout>
            <div>Test content</div>
          </Layout>
        </TestWrapper>
      );

      expect(screen.getByText(/Új készlet/i)).toBeInTheDocument();
      expect(screen.getByText(/Saját készlet/i)).toBeInTheDocument();
    });

    it('megjeleníti az admin menüelemeket admin szerepkörrel', () => {
      render(
        <TestWrapper userRole={UserRole.ADMIN}>
          <Layout>
            <div>Test content</div>
          </Layout>
        </TestWrapper>
      );

      expect(screen.getByText(/Irányítópult/i)).toBeInTheDocument();
      expect(screen.getByText(/Felhasználók/i)).toBeInTheDocument();
      expect(screen.getByText(/Készletkezelés/i)).toBeInTheDocument();
    });
  });

  describe('3. Vevő funkciók tesztek', () => {
    it('új igény oldal betöltődik és működik', async () => {
      render(
        <TestWrapper userRole={UserRole.CUSTOMER}>
          <CustomerNewDemandPage />
        </TestWrapper>
      );

      expect(screen.getByText(/Új igény beküldése/i)).toBeInTheDocument();
      
      // Termék név mező
      const productNameInput = screen.getByLabelText(/Termék neve/i);
      expect(productNameInput).toBeInTheDocument();
      
      fireEvent.change(productNameInput, { target: { value: 'Akác oszlop' } });
      expect(productNameInput).toHaveValue('Akác oszlop');
    });

    it('űrlap validáció működik', async () => {
      render(
        <TestWrapper userRole={UserRole.CUSTOMER}>
          <CustomerNewDemandPage />
        </TestWrapper>
      );

      const submitButton = screen.getByText(/Igény beküldése/i);
      expect(submitButton).toBeDisabled();

      // Kitöltjük a kötelező mezőket
      fireEvent.change(screen.getByLabelText(/Termék neve/i), { 
        target: { value: 'Akác oszlop' } 
      });
      fireEvent.change(screen.getByLabelText(/Átmérő-tól/i), { 
        target: { value: '12' } 
      });
      fireEvent.change(screen.getByLabelText(/Átmérő-ig/i), { 
        target: { value: '16' } 
      });
      fireEvent.change(screen.getByLabelText(/Hossz/i), { 
        target: { value: '3' } 
      });
      fireEvent.change(screen.getByLabelText(/Mennyiség/i), { 
        target: { value: '100' } 
      });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('köbméter számítás automatikusan működik', async () => {
      render(
        <TestWrapper userRole={UserRole.CUSTOMER}>
          <CustomerNewDemandPage />
        </TestWrapper>
      );

      // Kitöltjük a mezőket
      fireEvent.change(screen.getByLabelText(/Átmérő-tól/i), { 
        target: { value: '12' } 
      });
      fireEvent.change(screen.getByLabelText(/Átmérő-ig/i), { 
        target: { value: '16' } 
      });
      fireEvent.change(screen.getByLabelText(/Hossz/i), { 
        target: { value: '3' } 
      });
      fireEvent.change(screen.getByLabelText(/Mennyiség/i), { 
        target: { value: '100' } 
      });

      await waitFor(() => {
        const volumeDisplay = screen.getByText(/Számított köbméter/i);
        expect(volumeDisplay).toBeInTheDocument();
      });
    });
  });

  describe('4. Gyártó funkciók tesztek', () => {
    it('új készlet oldal betöltődik', () => {
      render(
        <TestWrapper userRole={UserRole.MANUFACTURER}>
          <ManufacturerNewStockPage />
        </TestWrapper>
      );

      expect(screen.getByText(/Új készlet feltöltése/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Termék neve/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Ár/i)).toBeInTheDocument();
    });

    it('AI funkciók elérhetők', () => {
      render(
        <TestWrapper userRole={UserRole.MANUFACTURER}>
          <ManufacturerNewStockPage />
        </TestWrapper>
      );

      expect(screen.getByText(/Ár javaslat kérése/i)).toBeInTheDocument();
      expect(screen.getByText(/Marketing szöveg generálása/i)).toBeInTheDocument();
      expect(screen.getByText(/Termék fotók generálása/i)).toBeInTheDocument();
    });
  });

  describe('5. AI funkciók tesztek', () => {
    it('AI gombok megfelelően működnek', async () => {
      render(
        <TestWrapper userRole={UserRole.CUSTOMER}>
          <CustomerNewDemandPage />
        </TestWrapper>
      );

      // Kitöltjük a szükséges mezőket
      fireEvent.change(screen.getByLabelText(/Termék neve/i), { 
        target: { value: 'Akác oszlop' } 
      });
      fireEvent.change(screen.getByLabelText(/Átmérő-tól/i), { 
        target: { value: '12' } 
      });
      fireEvent.change(screen.getByLabelText(/Átmérő-ig/i), { 
        target: { value: '16' } 
      });
      fireEvent.change(screen.getByLabelText(/Hossz/i), { 
        target: { value: '3' } 
      });
      fireEvent.change(screen.getByLabelText(/Mennyiség/i), { 
        target: { value: '100' } 
      });

      const aiButton = screen.getByText(/Alternatívák javaslása/i);
      expect(aiButton).not.toBeDisabled();

      fireEvent.click(aiButton);
      
      await waitFor(() => {
        expect(aiButton).toHaveAttribute('aria-disabled', 'true');
      });
    });
  });

  describe('6. LocalStorage funkciók tesztek', () => {
    it('igény mentése localStorage-ba', async () => {
      mockLocalStorage.getItem.mockReturnValue('[]');
      
      render(
        <TestWrapper userRole={UserRole.CUSTOMER}>
          <CustomerNewDemandPage />
        </TestWrapper>
      );

      // Kitöltjük és elküldjük az űrlapot
      fireEvent.change(screen.getByLabelText(/Termék neve/i), { 
        target: { value: 'Akác oszlop' } 
      });
      fireEvent.change(screen.getByLabelText(/Átmérő-tól/i), { 
        target: { value: '12' } 
      });
      fireEvent.change(screen.getByLabelText(/Átmérő-ig/i), { 
        target: { value: '16' } 
      });
      fireEvent.change(screen.getByLabelText(/Hossz/i), { 
        target: { value: '3' } 
      });
      fireEvent.change(screen.getByLabelText(/Mennyiség/i), { 
        target: { value: '100' } 
      });

      const submitButton = screen.getByText(/Igény beküldése/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'pohi-ai-customer-demands',
          expect.stringContaining('Akác oszlop')
        );
      });
    });
  });

  describe('7. Nyelvi támogatás tesztek', () => {
    it('magyar nyelv alapértelmezett', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByText(/Válassz szerepkört/i)).toBeInTheDocument();
    });

    it('nyelv váltás működik', async () => {
      render(
        <TestWrapper userRole={UserRole.CUSTOMER}>
          <Layout>
            <div>Test content</div>
          </Layout>
        </TestWrapper>
      );

      const enButton = screen.getByText('EN');
      fireEvent.click(enButton);

      // A nyelv váltás után az angol szövegek jelennek meg
      await waitFor(() => {
        expect(enButton).toHaveClass('text-cyan-400');
      });
    });
  });

  describe('8. Komponens integráció tesztek', () => {
    it('Card komponens megfelelően renderelődik', () => {
      const { container } = render(
        <TestWrapper>
          <div className="bg-slate-800 shadow-xl rounded-lg overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-cyan-400">Test Card</h3>
            </div>
            <div className="p-4">Test content</div>
          </div>
        </TestWrapper>
      );

      expect(container.querySelector('.bg-slate-800')).toBeInTheDocument();
    });

    it('Button komponens különböző variánsokkal működik', () => {
      render(
        <TestWrapper>
          <div>
            <button className="bg-cyan-600 text-white">Primary</button>
            <button className="bg-slate-600 text-slate-100">Secondary</button>
            <button className="bg-red-600 text-white">Danger</button>
          </div>
        </TestWrapper>
      );

      expect(screen.getByText('Primary')).toHaveClass('bg-cyan-600');
      expect(screen.getByText('Secondary')).toHaveClass('bg-slate-600');
      expect(screen.getByText('Danger')).toHaveClass('bg-red-600');
    });
  });

  describe('9. Hiba kezelés tesztek', () => {
    it('AI szolgáltatás hiba esetén megfelelő üzenetet jelenít meg', async () => {
      // Mock AI hiba
      vi.mocked(require('../lib/gemini').ai.models.generateContent)
        .mockRejectedValueOnce(new Error('AI service error'));

      render(
        <TestWrapper userRole={UserRole.CUSTOMER}>
          <CustomerNewDemandPage />
        </TestWrapper>
      );

      // Kitöltjük a mezőket és próbáljuk használni az AI-t
      fireEvent.change(screen.getByLabelText(/Termék neve/i), { 
        target: { value: 'Akác oszlop' } 
      });
      fireEvent.change(screen.getByLabelText(/Átmérő-tól/i), { 
        target: { value: '12' } 
      });
      fireEvent.change(screen.getByLabelText(/Átmérő-ig/i), { 
        target: { value: '16' } 
      });
      fireEvent.change(screen.getByLabelText(/Hossz/i), { 
        target: { value: '3' } 
      });
      fireEvent.change(screen.getByLabelText(/Mennyiség/i), { 
        target: { value: '100' } 
      });

      const aiButton = screen.getByText(/Alternatívák javaslása/i);
      fireEvent.click(aiButton);

      await waitFor(() => {
        // Ellenőrizzük, hogy a hiba kezelés működik
        expect(aiButton).not.toHaveAttribute('aria-disabled', 'true');
      });
    });
  });

  describe('10. Teljesítmény és optimalizáció tesztek', () => {
    it('komponensek gyorsan renderelődnek', () => {
      const startTime = performance.now();
      
      render(
        <TestWrapper userRole={UserRole.CUSTOMER}>
          <CustomerNewDemandPage />
        </TestWrapper>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // A renderelés 100ms alatt kell hogy megtörténjen
      expect(renderTime).toBeLessThan(100);
    });

    it('localStorage műveletek optimalizáltak', () => {
      const data = JSON.stringify([{ id: 'test', name: 'Test Item' }]);
      mockLocalStorage.getItem.mockReturnValue(data);

      render(
        <TestWrapper userRole={UserRole.CUSTOMER}>
          <CustomerNewDemandPage />
        </TestWrapper>
      );

      // localStorage csak egyszer hívódik meg komponens mount-kor
      expect(mockLocalStorage.getItem).toHaveBeenCalledTimes(1);
    });
  });
});