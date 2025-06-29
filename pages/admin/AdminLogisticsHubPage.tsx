
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageTitle from '../../components/PageTitle';
import Card from '../../components/Card';
import Select from '../../components/Select';
import Button from '../../components/Button';
import AiFeatureButton from '../../components/AiFeatureButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import VisualTruckLoad from '../../components/VisualTruckLoad';
import SimulatedRouteMap from '../../components/SimulatedRouteMap';
import Textarea from '../../components/Textarea';
import { 
    MockCompany, UserRole, DemandItem, StockItem, DemandStatus, StockStatus, 
    LoadingPlan, ProductFeatures, ConfirmedMatch, Waypoint, LoadingPlanItem, LoadingPlanResponse
} from '../../types';
import { TranslationKey, PRODUCT_TYPE_FORECAST_OPTIONS, getTranslatedUserRole } from '../../locales'; // Updated import
import { 
    ClipboardDocumentListIcon, UsersIcon, BuildingStorefrontIcon, RocketLaunchIcon 
} from '@heroicons/react/24/outline';
import { useLocale } from '../../LocaleContext';
import { MOCK_COMPANIES_STORAGE_KEY, CUSTOMER_DEMANDS_STORAGE_KEY, MANUFACTURER_STOCK_STORAGE_KEY, CONFIRMED_MATCHES_STORAGE_KEY } from '../../constants';
import { ai } from '../../lib/gemini';
import { GenerateContentResponse } from "@google/genai";
import { calculateVolume, generateMockConfirmedMatches } from '../../lib/utils';

interface LogisticsHubState {
  selectedProductType: string;
  selectedRoleView: 'customer' | 'manufacturer';
  customers: MockCompany[];
  manufacturers: MockCompany[];
  demands: DemandItem[];
  stockItems: StockItem[];
  isLoading: boolean;
  
  isSimulationLoading: boolean;
  simulatedLoadingPlan: LoadingPlan | null;
  simulatedCarrierEmail: string | null;
  simulationError: string | null;
}

export const AdminLogisticsHubPage: React.FC = () => {
  const { t, locale } = useLocale();
  const [state, setState] = useState<LogisticsHubState>({
    selectedProductType: PRODUCT_TYPE_FORECAST_OPTIONS[0]?.value || '',
    selectedRoleView: 'customer',
    customers: [],
    manufacturers: [],
    demands: [],
    stockItems: [],
    isLoading: true,
    isSimulationLoading: false,
    simulatedLoadingPlan: null,
    simulatedCarrierEmail: null,
    simulationError: null,
  });

  useEffect(() => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const companiesRaw = localStorage.getItem(MOCK_COMPANIES_STORAGE_KEY);
      const demandsRaw = localStorage.getItem(CUSTOMER_DEMANDS_STORAGE_KEY);
      const stockRaw = localStorage.getItem(MANUFACTURER_STOCK_STORAGE_KEY);

      const allCompanies: MockCompany[] = companiesRaw ? JSON.parse(companiesRaw) : [];
      const allDemands: DemandItem[] = demandsRaw ? JSON.parse(demandsRaw) : [];
      const allStock: StockItem[] = stockRaw ? JSON.parse(stockRaw) : [];
      
      setState(prev => ({
        ...prev,
        customers: allCompanies.filter(c => c.role === UserRole.CUSTOMER),
        manufacturers: allCompanies.filter(c => c.role === UserRole.MANUFACTURER),
        demands: allDemands,
        stockItems: allStock,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error loading data for Logistics Hub:", error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const handleProductTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setState(prev => ({ ...prev, selectedProductType: e.target.value }));
  };

  const getCustomerStatus = (customerId: string): string => {
    const customerDemands = state.demands.filter(d => d.submittedByCompanyId === customerId);
    const hasActiveOrders = customerDemands.some(d => d.status === DemandStatus.RECEIVED || d.status === DemandStatus.PROCESSING);
    return hasActiveOrders ? t('logisticsHub_status_customer_activeOrders') : t('logisticsHub_status_customer_noActiveOrders');
  };

  const getManufacturerStatus = (manufacturerId: string): string => {
    const manufacturerStock = state.stockItems.filter(s => s.uploadedByCompanyId === manufacturerId);
    const hasActiveStock = manufacturerStock.some(s => s.status === StockStatus.AVAILABLE);
    return hasActiveStock ? t('logisticsHub_status_manufacturer_activeStock') : t('logisticsHub_status_manufacturer_noActiveStock');
  };

  const parseJsonFromGeminiResponse = useCallback(function <T>(textValue: string, featureNameKey: TranslationKey): T | string {
    let jsonStr = textValue.trim(); 
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const matchResult = jsonStr.match(fenceRegex); 
    if (matchResult && matchResult[2]) {
      jsonStr = matchResult[2].trim();
    }
    try {
      return JSON.parse(jsonStr) as T;
    } catch (errorCaught: any) { 
      const featureNameText = t(featureNameKey);
      console.error(`Failed to parse JSON response for ${featureNameText}:`, errorCaught, "Raw text:", textValue);
      return t('adminTruckPlanning_error_parsing_truck', { featureName: featureNameText, rawResponse: textValue.substring(0,300) });
    }
  }, [t]);

  const runAiTruckPlanningSimulation = async () => {
    if (!ai) {
      setState(prev => ({ ...prev, simulationError: t('customerNewDemand_error_aiUnavailable'), isSimulationLoading: false }));
      return;
    }
    setState(prev => ({ ...prev, isSimulationLoading: true, simulatedLoadingPlan: null, simulatedCarrierEmail: null, simulationError: null }));

    let matchesForPlanning: ConfirmedMatch[] = [];
    try {
        const matchesRaw = localStorage.getItem(CONFIRMED_MATCHES_STORAGE_KEY);
        const allConfirmedMatches: ConfirmedMatch[] = matchesRaw ? JSON.parse(matchesRaw) : [];
        matchesForPlanning = allConfirmedMatches.filter(m => !m.billed);

        if (matchesForPlanning.length < 2) { // Need at least a couple of items for meaningful planning
            console.log("Insufficient real matches, generating mock matches for simulation.");
            const mockCustomersForGenerator: MockCompany[] = state.customers.length > 0 ? state.customers : [{id: 'CUST-MOCK-1', companyName: 'Mock Vevő Kft', role: UserRole.CUSTOMER, address: {city: 'Budapest', country: 'Magyarország'}}];
            const mockManufacturersForGenerator: MockCompany[] = state.manufacturers.length > 0 ? state.manufacturers : [{id: 'MAN-MOCK-1', companyName: 'Mock Gyártó Zrt', role: UserRole.MANUFACTURER, address: {city: 'Debrecen', country: 'Magyarország'}}];
            matchesForPlanning = generateMockConfirmedMatches(3, mockCustomersForGenerator, mockManufacturersForGenerator, t); // Generate 3 mock matches
        }
    } catch(e) {
        console.error("Error preparing matches for simulation:", e);
        setState(prev => ({ ...prev, simulationError: "Error preparing data for simulation.", isSimulationLoading: false }));
        return;
    }
    
    if (matchesForPlanning.length === 0) {
      setState(prev => ({ ...prev, simulationError: t('adminTruckPlanning_error_noMatchesForPlanning'), isSimulationLoading: false }));
      return;
    }

    const pickupPoints = matchesForPlanning.map(match => {
        const manufacturer = state.manufacturers.find(m => m.id === match.stockDetails.uploadedByCompanyId) || 
                             state.customers.find(c => c.id === match.stockDetails.uploadedByCompanyId); // Fallback if admin uploaded for someone
        return {
            companyName: manufacturer?.companyName || match.stockDetails.uploadedByCompanyName || 'Ismeretlen Gyártó',
            address: manufacturer?.address ? `${manufacturer.address.street || t('logisticsHub_data_not_available_short')}, ${manufacturer.address.zipCode || ''} ${manufacturer.address.city || t('logisticsHub_data_not_available_short')}, ${manufacturer.address.country || t('logisticsHub_data_not_available_short')}`.replace(/^,|,$/g, '').trim() : t('logisticsHub_data_not_available_short'),
            items: [{ 
                productName: match.stockDetails.productName || t('productType_acaciaDebarkedSandedPost'),
                quantity: match.stockDetails.quantity,
                volumeM3: match.stockDetails.cubicMeters?.toFixed(2) || 'N/A',
                stockId: match.stockId,
            }]
        };
    });

    const dropoffPoints = matchesForPlanning.map(match => {
        const customer = state.customers.find(c => c.id === match.demandDetails.submittedByCompanyId);
        return {
            companyName: customer?.companyName || match.demandDetails.submittedByCompanyName || 'Ismeretlen Vevő',
            address: customer?.address ? `${customer.address.street || t('logisticsHub_data_not_available_short')}, ${customer.address.zipCode || ''} ${customer.address.city || t('logisticsHub_data_not_available_short')}, ${customer.address.country || t('logisticsHub_data_not_available_short')}`.replace(/^,|,$/g, '').trim() : t('logisticsHub_data_not_available_short'),
            items: [{ 
                productName: match.demandDetails.productName || t('productType_acaciaDebarkedSandedPost'),
                quantity: match.demandDetails.quantity,
                volumeM3: match.demandDetails.cubicMeters?.toFixed(2) || 'N/A',
                demandId: match.demandId,
            }]
        };
    });
    
    const currentPromptLang: string = locale === 'hu' ? 'Hungarian' : 'English';
    const productNameKey: TranslationKey = 'productType_acaciaDebarkedSandedPost'; 
    const resolvedProductName: string = t(productNameKey);

    const planPrompt = `You are a logistics planner for "Pohi AI Pro". Create an optimal loading and transport plan for a 25m³ (approx. 24-ton) truck in ${currentPromptLang}.
The transport involves consolidating items for multiple Customers, picked up from multiple Manufacturers.
Products are timber, primarily ${resolvedProductName}.

Pickup locations and items:
${JSON.stringify(pickupPoints, null, 2)}

Drop-off locations and items:
${JSON.stringify(dropoffPoints, null, 2)}

The response MUST be a valid JSON object in ${currentPromptLang} with fields: "planDetails" (string summary), "items" (LoadingPlanItem[]: name, volumeM3, destinationName, dropOffOrder, loadingSuggestion, quality, notesOnItem, demandId, stockId, companyId), "capacityUsed" (string percentage), "waypoints" (Waypoint[]: name, type ('pickup'|'dropoff'), order), "optimizedRouteDescription" (string).
Ensure 'items' and 'waypoints' arrays are correctly formatted. Each object in these arrays must be valid.
Example for 'items' array element: { "name": "${resolvedProductName} - for Customer Example Kft, 100 pcs", "volumeM3": "8", "destinationName": "Customer Example Kft", "dropOffOrder": 1, "loadingSuggestion": "Load this towards the back as it's the first drop-off.", "quality": "Prima A/B", "notesOnItem": "Demand ID: DEM-123, Stock ID: STK-456", "demandId": "DEM-123", "stockId": "STK-456", "companyId": "CUST-MOCK-1" }
Example for 'waypoints' array element: { "name": "Manufacturer Example Zrt - Pickup", "type": "pickup", "order": 0 }
The JSON MUST be the ONLY content in your response.`;

    try {
      const planResponse: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: planPrompt,
        config: { responseMimeType: "application/json" }
      });
      
      const parsedPlan = parseJsonFromGeminiResponse<LoadingPlanResponse>(planResponse.text, "adminTruckPlanning_optimalLoadingPlan" as TranslationKey);

      if (typeof parsedPlan === 'string') {
        setState(prev => ({ ...prev, simulationError: parsedPlan, isSimulationLoading: false }));
        return;
      }
      
      // Basic validation of the parsed plan structure
      if (!parsedPlan.items || !Array.isArray(parsedPlan.items) || !parsedPlan.waypoints || !Array.isArray(parsedPlan.waypoints)) {
        setState(prev => ({ ...prev, simulationError: "AI returned an invalid plan structure for items or waypoints.", isSimulationLoading: false }));
        return;
      }
      
      const finalPlan: LoadingPlan = { ...parsedPlan, id: `SIM-${Date.now()}` };
      setState(prev => ({ ...prev, simulatedLoadingPlan: finalPlan }));

      // Generate Carrier Email
      const emailPrompt = `Based on the following timber loading plan, draft a professional email in ${currentPromptLang} to a generic carrier ("Tisztelt Fuvarozó Partnerünk!" or "Dear Carrier Partner,") to order transport.
Plan Summary: ${finalPlan.planDetails}
Route: ${finalPlan.optimizedRouteDescription || 'Details to follow'}
Key Items: ${ (Array.isArray(finalPlan.items) && finalPlan.items.length > 0 && typeof finalPlan.items[0] === 'object') ? (finalPlan.items as LoadingPlanItem[]).slice(0,2).map(it => it.name).join(', ') : resolvedProductName }
The response should ONLY be the email text.`;
      
      const emailResponse: GenerateContentResponse = await ai.models.generateContent({ model: "gemini-2.5-flash-preview-04-17", contents: emailPrompt });
      setState(prev => ({ ...prev, simulatedCarrierEmail: emailResponse.text || t('adminShippingTemplates_error_emailGeneric') }));

    } catch (error: any) {
      console.error("Error during AI truck planning simulation:", error);
      setState(prev => ({ ...prev, simulationError: error.message || t('adminTruckPlanning_error_critical_truck', {featureName: 'Simulation'}), isSimulationLoading: false }));
    } finally {
      setState(prev => ({ ...prev, isSimulationLoading: false }));
    }
  };


  const productTypeOptions = PRODUCT_TYPE_FORECAST_OPTIONS.map(opt => ({
    value: opt.value,
    label: t(opt.labelKey as TranslationKey) 
  }));

  if (state.isLoading) {
    return <LoadingSpinner text={t('adminMatchmaking_loadingCompanyData')} />;
  }

  return (
    <>
      <PageTitle title={t('logisticsHub_title')} subtitle={t('logisticsHub_subtitle')} icon={<ClipboardDocumentListIcon className="h-8 w-8" />} />

      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Select
            label={t('logisticsHub_productTypeLabel')}
            options={productTypeOptions}
            value={state.selectedProductType}
            onChange={handleProductTypeChange}
          />
          <div className="md:col-span-2 flex space-x-2">
            <Button
              variant={state.selectedRoleView === 'customer' ? 'primary' : 'secondary'}
              onClick={() => setState(prev => ({ ...prev, selectedRoleView: 'customer' }))}
              leftIcon={<UsersIcon className="h-5 w-5" />}
              className="flex-1"
            >
              {t('userRole_CUSTOMER')}
            </Button>
            <Button
              variant={state.selectedRoleView === 'manufacturer' ? 'primary' : 'secondary'}
              onClick={() => setState(prev => ({ ...prev, selectedRoleView: 'manufacturer' }))}
              leftIcon={<BuildingStorefrontIcon className="h-5 w-5" />}
              className="flex-1"
            >
              {t('userRole_MANUFACTURER')}
            </Button>
          </div>
        </div>
      </Card>

      {state.selectedRoleView === 'customer' && (
        <Card title={t('logisticsHub_customerListTitle')} bodyClassName="max-h-[500px] overflow-y-auto custom-scrollbar">
          {state.customers.length === 0 ? <p className="text-slate-400">{t('logisticsHub_noCustomersFound')}</p> : (
            <ul className="space-y-3">
              {state.customers.map(customer => (
                <li key={customer.id} className="p-3 bg-slate-700/50 rounded-md hover:bg-slate-600/50 transition-colors">
                  <Link to={`/admin/logistics-hub/customer/${customer.id}`} className="block">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-cyan-300">{customer.companyName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getCustomerStatus(customer.id) === t('logisticsHub_status_customer_activeOrders') ? 'bg-green-500 text-green-50' : 'bg-slate-500 text-slate-100'}`}>
                        {getCustomerStatus(customer.id)}
                      </span>
                    </div>
                    {customer.address && <p className="text-xs text-slate-400 mt-1">{customer.address.city}, {customer.address.country}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {state.selectedRoleView === 'manufacturer' && (
        <Card title={t('logisticsHub_manufacturerListTitle')} bodyClassName="max-h-[500px] overflow-y-auto custom-scrollbar">
          {state.manufacturers.length === 0 ? <p className="text-slate-400">{t('logisticsHub_noManufacturersFound')}</p> : (
            <ul className="space-y-3">
              {state.manufacturers.map(manufacturer => (
                <li key={manufacturer.id} className="p-3 bg-slate-700/50 rounded-md hover:bg-slate-600/50 transition-colors">
                   <Link to={`/admin/logistics-hub/manufacturer/${manufacturer.id}`} className="block">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-emerald-300">{manufacturer.companyName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getManufacturerStatus(manufacturer.id) === t('logisticsHub_status_manufacturer_activeStock') ? 'bg-green-500 text-green-50' : 'bg-slate-500 text-slate-100'}`}>
                        {getManufacturerStatus(manufacturer.id)}
                      </span>
                    </div>
                    {manufacturer.address && <p className="text-xs text-slate-400 mt-1">{manufacturer.address.city}, {manufacturer.address.country}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      
      <Card title={t('logisticsHub_truckPlanningTitle')} className="mt-6">
          <p className="text-sm text-slate-300 mb-3">{t('logisticsHub_truckPlanningDescription')}</p>
          <AiFeatureButton
            text={t('logisticsHub_runSimulationButton')}
            onClick={runAiTruckPlanningSimulation}
            isLoading={state.isSimulationLoading}
            leftIcon={<RocketLaunchIcon className="h-5 w-5 text-purple-400" />}
            disabled={!ai}
          />
          {state.isSimulationLoading && <LoadingSpinner text={t('logisticsHub_simulationLoading')} />}
          {state.simulationError && <p className="text-sm text-red-400 mt-2">{state.simulationError}</p>}
          
          {state.simulatedLoadingPlan && !state.isSimulationLoading && (
            <div className="mt-4 space-y-6">
                <h3 className="text-lg font-semibold text-cyan-300">{t('logisticsHub_sim_resultsTitle')}</h3>
                <VisualTruckLoad items={Array.isArray(state.simulatedLoadingPlan.items) ? state.simulatedLoadingPlan.items as LoadingPlanItem[] : []} planDetails={state.simulatedLoadingPlan.planDetails} />
                <SimulatedRouteMap waypoints={state.simulatedLoadingPlan.waypoints || []} optimizedRouteDescription={state.simulatedLoadingPlan.optimizedRouteDescription} />
                
                <Card title={t('logisticsHub_sim_planSummaryTitle')} className="bg-slate-700/30">
                     <p className="text-sm text-slate-200"><strong>{t('adminTruckPlanning_planDetails')}</strong> {state.simulatedLoadingPlan.planDetails}</p>
                     {Array.isArray(state.simulatedLoadingPlan.items) && (state.simulatedLoadingPlan.items as LoadingPlanItem[]).length > 0 && (
                        <div>
                            <h6 className="text-sm font-semibold text-slate-100 mt-2">{t('adminTruckPlanning_planItems')}</h6>
                            <ul className="space-y-1 mt-1 text-xs max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                {(state.simulatedLoadingPlan.items as LoadingPlanItem[]).map((item, index) => (
                                    <li key={index} className="p-1.5 bg-slate-600/40 rounded">
                                        <span className="font-medium text-cyan-400 block">{item.name}</span>
                                        <span className="text-slate-300">Vol: {item.volumeM3}, Dest: {item.destinationName}, Order: {item.dropOffOrder}</span>
                                        {item.loadingSuggestion && <p className="text-slate-400 italic text-[11px]">"{item.loadingSuggestion}"</p>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                     )}
                     <p className="text-sm text-slate-200 mt-2"><strong>{t('adminTruckPlanning_planCapacityUsed')}</strong> {state.simulatedLoadingPlan.capacityUsed}</p>
                </Card>

                {state.simulatedCarrierEmail && (
                    <Card title={t('logisticsHub_sim_carrierEmailTitle')} className="bg-slate-700/30">
                        <Textarea value={state.simulatedCarrierEmail} readOnly rows={8} textareaClassName="text-xs"/>
                    </Card>
                )}
            </div>
          )}
      </Card>
    </>
  );
};

// export default AdminLogisticsHubPage; // This will be handled by changing the export to named
