

import React, { useState, useEffect, useCallback } from 'react';
import PageTitle from '../../components/PageTitle';
import Card from '../../components/Card';
import Button from '../../components/Button';
import AiFeatureButton from '../../components/AiFeatureButton';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import Select from '../../components/Select';
import LoadingSpinner from '../../components/LoadingSpinner';
import SimpleBarChart from '../../components/SimpleBarChart'; 
import GeminiAssistantWidget from '../../components/GeminiAssistantWidget'; 
import { MOCK_AI_RESPONSES, CUSTOMER_DEMANDS_STORAGE_KEY, MANUFACTURER_STOCK_STORAGE_KEY, MOCK_COMPANIES_STORAGE_KEY, CONFIRMED_MATCHES_STORAGE_KEY } from '../../constants'; // Added CONFIRMED_MATCHES_STORAGE_KEY
import { REGION_OPTIONS, PRODUCT_TYPE_FORECAST_OPTIONS, getTranslatedDemandStatus, getTranslatedStockStatus, getTranslatedUserRole, TranslationKey, DIAMETER_TYPE_OPTIONS } from '../../locales'; // Added DIAMETER_TYPE_OPTIONS
import { 
  MarketNewsItem, 
  FaqItem, 
  DemandForecast, 
  FeedbackAnalysisData,
  UserActivitySummary,
  ProductPerformanceData,
  SystemHealthStatusItem,
  UserRole,
  DemandStatus, 
  StockStatus,  
  DemandItem,   
  StockItem,    
  OrderStatusSummaryPoint,
  StockStatusSummaryPoint,
  KeyProductPriceTrend,
  MockCompany,
  AnomalyReportItem, 
  AnomalySeverity,
  GeneratedDataReport,
  PlatformOverviewMetrics, 
  RecentActivityItem,
  ConfirmedMatch // Added ConfirmedMatch
} from '../../types';
import { 
  ChartBarIcon, 
  NewspaperIcon, 
  QuestionMarkCircleIcon, 
  ChatBubbleBottomCenterTextIcon, 
  MapIcon, 
  BellAlertIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClipboardDocumentListIcon,
  ArchiveBoxIcon,
  BanknotesIcon,
  TrophyIcon,
  ShieldExclamationIcon, 
  InformationCircleIcon, 
  LightBulbIcon,
  BeakerIcon,
  EyeIcon, 
  UserGroupIcon, 
  CubeIcon as CubeIconOutline, 
  CheckBadgeIcon as CheckBadgeIconOutline, 
  SparklesIcon as SparklesIconOutline, 
} from '@heroicons/react/24/outline';
import { UserGroupIcon as UserGroupIconSolid, StarIcon as StarIconSolid, CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/20/solid'; 
import { GenerateContentResponse } from "@google/genai";
import { ai } from '../../lib/gemini';
import { useLocale } from '../../LocaleContext';
import { calculateVolume } from '../../lib/utils';

interface AdminFeatureState {
  marketNews?: MarketNewsItem[];
  marketInfoQuery?: string;
  marketInfoResponse?: string;
  newFeatureDescription?: string;
  generatedFaqForNewFeature?: FaqItem[];
  faqQuery?: string;
  faqAnswer?: string;
  feedbackText?: string;
  feedbackAnalysis?: FeedbackAnalysisData;
  forecastRegion?: string;
  forecastProductType?: string;
  demandForecast?: DemandForecast;
  detectedAnomalies?: AnomalyReportItem[] | string | null; 
  userActivitySummary?: UserActivitySummary;
  topPerformingProducts?: ProductPerformanceData[];
  systemHealthStatuses?: SystemHealthStatusItem[];
  orderStatusSummary?: OrderStatusSummaryPoint[]; 
  stockStatusSummary?: StockStatusSummaryPoint[]; 
  keyProductPriceTrend?: KeyProductPriceTrend;
  totalDemandsCount?: number; 
  totalStockItemsCount?: number; 
  topCustomersByVolume?: { label: string; value: number; color: string }[]; 
  topManufacturersByVolume?: { label: string; value: number; color: string }[]; 
  generatedDataReport?: GeneratedDataReport | null;
  platformOverview?: PlatformOverviewMetrics; 
  recentActivities?: RecentActivityItem[]; 
  platformInterpretation?: string; 
}

export const AdminDashboardPage: React.FC = () => {
  const { t, locale } = useLocale();
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<AdminFeatureState>({
      platformOverview: MOCK_AI_RESPONSES.platformOverviewMetrics, 
      recentActivities: MOCK_AI_RESPONSES.recentPlatformActivities, 
  });

  const DemandStatusColorMap: Record<DemandStatus, string> = {
    [DemandStatus.RECEIVED]: 'text-sky-400', 
    [DemandStatus.PROCESSING]: 'text-amber-400', 
    [DemandStatus.COMPLETED]: 'text-green-400', 
    [DemandStatus.CANCELLED]: 'text-red-400', 
  };

  const StockStatusColorMap: Record<StockStatus, string> = {
    [StockStatus.AVAILABLE]: 'text-emerald-400', 
    [StockStatus.RESERVED]: 'text-yellow-400', 
    [StockStatus.SOLD]: 'text-rose-400', 
  };

  const AnomalySeverityIconMap: Record<AnomalySeverity, React.ReactNode> = {
    [AnomalySeverity.HIGH]: <ShieldExclamationIcon className="h-6 w-6 text-red-500 flex-shrink-0" />,
    [AnomalySeverity.MEDIUM]: <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 flex-shrink-0" />,
    [AnomalySeverity.LOW]: <InformationCircleIcon className="h-6 w-6 text-sky-500 flex-shrink-0" />,
  };
   const getAnomalySeverityText = (severity: AnomalySeverity): string => {
    switch (severity) {
        case AnomalySeverity.HIGH: return t('adminDashboard_anomaly_severity_high');
        case AnomalySeverity.MEDIUM: return t('adminDashboard_anomaly_severity_medium');
        case AnomalySeverity.LOW: return t('adminDashboard_anomaly_severity_low');
        default: return String(severity);
    }
  };

  const getAnomalyTypeText = (type: string): string => {
     const key = `adminDashboard_anomaly_type_${type.toLowerCase().replace(/\s+/g, '_')}` as TranslationKey;
     const translated = t(key);
     return translated === key ? t('adminDashboard_anomaly_type_generic') : translated;
  };


  const parseJsonArrayFromGeminiResponse = useCallback(function <T>(textValue: string): T[] | string {
    let jsonStrToParse = textValue.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s; 
    const matchResult = jsonStrToParse.match(fenceRegex);
    if (matchResult && matchResult[2]) {
        jsonStrToParse = matchResult[2].trim();
    }
    try {
        const parsedData = JSON.parse(jsonStrToParse);
        if (Array.isArray(parsedData)) {
            return parsedData as T[];
        } else {
            console.error("Parsed data is not an array:", parsedData, "Raw text:", textValue);
            return t('adminDashboard_anomaly_error_parsing'); 
        }
    } catch (error: any) {
        console.error("Failed to parse JSON array response:", error, "Raw text:", textValue);
        return t('adminDashboard_anomaly_error_parsing');
    }
  }, [t]);

  const loadPlatformOverviewData = useCallback(() => {
    setIsLoading(prev => ({ ...prev, platformOverview: true }));
    const demandsRaw = localStorage.getItem(CUSTOMER_DEMANDS_STORAGE_KEY);
    const stockRaw = localStorage.getItem(MANUFACTURER_STOCK_STORAGE_KEY);
    const companiesRaw = localStorage.getItem(MOCK_COMPANIES_STORAGE_KEY);
    const matchesRaw = localStorage.getItem(CONFIRMED_MATCHES_STORAGE_KEY);

    const demands: DemandItem[] = demandsRaw ? JSON.parse(demandsRaw) : [];
    const stockItems: StockItem[] = stockRaw ? JSON.parse(stockRaw) : [];
    const allCompanies: MockCompany[] = companiesRaw ? JSON.parse(companiesRaw) : [];
    const confirmedMatches: ConfirmedMatch[] = matchesRaw ? JSON.parse(matchesRaw) : [];

    const totalActiveDemands = demands.filter(d => d.status === DemandStatus.RECEIVED || d.status === DemandStatus.PROCESSING).length;
    const totalAvailableStock = stockItems.filter(s => s.status === StockStatus.AVAILABLE).length;
    const totalCustomers = allCompanies.filter(c => c.role === UserRole.CUSTOMER).length;
    const totalManufacturers = allCompanies.filter(c => c.role === UserRole.MANUFACTURER).length;
    const currentMonthYear = new Date().toLocaleString(locale === 'hu' ? 'hu-HU' : 'en-US', { month: 'numeric', year: 'numeric' });
    const successfulMatchesThisMonth = confirmedMatches.filter(m => new Date(m.matchDate).toLocaleString(locale === 'hu' ? 'hu-HU' : 'en-US', { month: 'numeric', year: 'numeric' }) === currentMonthYear).length;

    let interpretationKey: TranslationKey = 'adminDashboard_overview_interpretation_balanced';
    if (totalActiveDemands > totalAvailableStock * 1.5) {
        interpretationKey = 'adminDashboard_overview_interpretation_high_demand';
    } else if (totalAvailableStock > totalActiveDemands * 1.5 && totalActiveDemands > 0) {
        interpretationKey = 'adminDashboard_overview_interpretation_high_stock';
    }
    
    const overview: PlatformOverviewMetrics = {
      totalActiveDemands,
      totalAvailableStock,
      totalCustomers,
      totalManufacturers,
      successfulMatchesThisMonth,
      aiInterpretationKey: interpretationKey
    };

    setState(prev => ({ ...prev, platformOverview: overview, platformInterpretation: t(interpretationKey) }));
    setIsLoading(prev => ({ ...prev, platformOverview: false }));
  }, [t, locale]);


  const loadDataForCharts = useCallback(() => {
    // Existing chart data loading logic ...
    const demandsRaw = localStorage.getItem(CUSTOMER_DEMANDS_STORAGE_KEY);
    const stockRaw = localStorage.getItem(MANUFACTURER_STOCK_STORAGE_KEY);
    const companiesRaw = localStorage.getItem(MOCK_COMPANIES_STORAGE_KEY);

    const demands: DemandItem[] = demandsRaw ? JSON.parse(demandsRaw) : [];
    const stockItems: StockItem[] = stockRaw ? JSON.parse(stockRaw) : [];
    const allCompanies: MockCompany[] = companiesRaw ? JSON.parse(companiesRaw) : [];

    const orderCounts: Record<DemandStatus, number> = {
      [DemandStatus.RECEIVED]: 0, [DemandStatus.PROCESSING]: 0,
      [DemandStatus.COMPLETED]: 0, [DemandStatus.CANCELLED]: 0,
    };
    demands.forEach(d => { if (orderCounts[d.status] !== undefined) orderCounts[d.status]++; });
    const totalDemandsVal = demands.length;
    const orderStatusSummaryData = Object.keys(orderCounts).map(statusKey => ({
        status: statusKey as DemandStatus,
        count: orderCounts[statusKey as DemandStatus],
        percentage: totalDemandsVal > 0 ? parseFloat(((orderCounts[statusKey as DemandStatus] / totalDemandsVal) * 100).toFixed(1)) : 0,
        colorClass: DemandStatusColorMap[statusKey as DemandStatus] || 'bg-slate-500'
    }));

    const stockCounts: Record<StockStatus, number> = {
      [StockStatus.AVAILABLE]: 0, [StockStatus.RESERVED]: 0, [StockStatus.SOLD]: 0,
    };
    stockItems.forEach(s => { if (s.status && stockCounts[s.status] !== undefined) stockCounts[s.status]++; });
    const totalStockItemsVal = stockItems.length;
    const stockStatusSummaryData = Object.keys(stockCounts).map(statusKey => ({
        status: statusKey as StockStatus,
        count: stockCounts[statusKey as StockStatus],
        percentage: totalStockItemsVal > 0 ? parseFloat(((stockCounts[statusKey as StockStatus] / totalStockItemsVal) * 100).toFixed(1)) : 0,
        colorClass: StockStatusColorMap[statusKey as StockStatus] || 'bg-slate-500'
    }));

    const customerVolumes: Record<string, number> = {};
    demands.forEach(item => {
      if (item.submittedByCompanyId && item.cubicMeters) {
        customerVolumes[item.submittedByCompanyId] = (customerVolumes[item.submittedByCompanyId] || 0) + item.cubicMeters;
      }
    });
    const topCustomersChartData = allCompanies
      .filter(c => c.role === UserRole.CUSTOMER && customerVolumes[c.id] > 0)
      .map(company => ({ company, totalVolume: customerVolumes[company.id] }))
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 5)
      .map((cv, index) => ({
          label: cv.company.companyName.length > 15 ? `${cv.company.companyName.substring(0,12)}...` : cv.company.companyName,
          value: parseFloat(cv.totalVolume.toFixed(2)),
          color: `text-sky-${700 - index * 100}` 
      }));

    const manufacturerVolumes: Record<string, number> = {};
    stockItems.forEach(item => {
      if (item.uploadedByCompanyId && item.cubicMeters) {
        manufacturerVolumes[item.uploadedByCompanyId] = (manufacturerVolumes[item.uploadedByCompanyId] || 0) + item.cubicMeters;
      }
    });
    const topManufacturersChartData = allCompanies
      .filter(c => c.role === UserRole.MANUFACTURER && manufacturerVolumes[c.id] > 0)
      .map(company => ({ company, totalVolume: manufacturerVolumes[company.id] }))
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 5)
      .map((cv, index) => ({
          label: cv.company.companyName.length > 15 ? `${cv.company.companyName.substring(0,12)}...` : cv.company.companyName,
          value: parseFloat(cv.totalVolume.toFixed(2)),
          color: `text-emerald-${700 - index * 100}` 
      }));

    setState(prev => ({
      ...prev,
      orderStatusSummary: orderStatusSummaryData,
      totalDemandsCount: totalDemandsVal,
      stockStatusSummary: stockStatusSummaryData,
      totalStockItemsCount: totalStockItemsVal,
      topCustomersByVolume: topCustomersChartData,
      topManufacturersByVolume: topManufacturersChartData,
      userActivitySummary: MOCK_AI_RESPONSES.userActivitySummary, 
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]); 

  useEffect(() => {
    loadDataForCharts();
    loadPlatformOverviewData(); 
    // Set recent activities from mock, can be dynamic later
    setState(prev => ({...prev, recentActivities: MOCK_AI_RESPONSES.recentPlatformActivities}));
  }, [loadDataForCharts, loadPlatformOverviewData]); 

  const handleAiFeatureClick = (
    featureKey: keyof AdminFeatureState,
    dataGenerator: () => any,
    delay: number = 500 
  ) => {
    setIsLoading(prev => ({ ...prev, [featureKey]: true }));
    setState(prev => ({ ...prev, [featureKey as string]: undefined } as AdminFeatureState));

    setTimeout(() => {
      let result = dataGenerator();
      if (featureKey === 'marketNews' && Array.isArray(result)) {
          result = result.map((news: MarketNewsItem) => ({
          ...news,
          title: t(news.title as TranslationKey),
          content: t(news.content as TranslationKey),
          }));
      }
      if (featureKey === 'marketInfoResponse' && typeof result === 'string') result = t(result as TranslationKey);
      if (featureKey === 'generatedFaqForNewFeature' && Array.isArray(result)) result = result.map((faq: FaqItem) => ({...faq, question: t(faq.question as TranslationKey), answer: t(faq.answer as TranslationKey) }));
      if (featureKey === 'faqAnswer' && typeof result === 'string') result = t(result as TranslationKey);
      
      if (featureKey === 'detectedAnomalies') {
        if (typeof result === 'string' && result === MOCK_AI_RESPONSES.noAnomaliesFoundMessage) {
            result = t(result as TranslationKey);
        } else if (Array.isArray(result)) { 
            result = result.map((item: AnomalyReportItem) => ({
                ...item,
                description: t(item.description as TranslationKey) === item.description ? item.description : t(item.description as TranslationKey),
                recommendation: t(item.recommendation as TranslationKey) === item.recommendation ? item.recommendation : t(item.recommendation as TranslationKey)
            }));
        }
      }
      setState(prev => ({ ...prev, [featureKey as string]: result } as AdminFeatureState));
      setIsLoading(prev => ({ ...prev, [featureKey]: false }));
    }, delay);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, [name]: value } as AdminFeatureState));
  };

  const generateAnomalyDetectionData = async () => {
    if (!ai) {
      return t('customerNewDemand_error_aiUnavailable');
    }
    const promptLang = locale === 'hu' ? 'Hungarian' : (locale === 'de' ? 'German' : 'English');
    const prompt = `As an AI assistant for Pohi AI Pro, analyze platform data for anomalies.
Identify 2-4 potential anomalies from various categories like:
- pricing_spike (e.g., unusually high price for a common item)
- activity_surge (e.g., sudden increase in user registrations or demands from a region)
- inventory_mismatch (e.g., stock item sold but still listed as available after a reasonable time)
- unusual_login (e.g., multiple failed login attempts for an admin account)
- demand_drop (e.g., significant decrease in new demands for a popular product type)
- bulk_upload_low_price (e.g., a manufacturer uploads many items at unusually low prices)
- demand_surge (e.g., sudden high demand for a niche product)

For each anomaly, provide a JSON object with these fields:
- "id": string (a unique ID for this anomaly, e.g., "anomaly-price-{{timestamp_short}}")
- "type": string (one of the example types above, or a similar descriptive type)
- "severity": string ("low", "medium", or "high")
- "description": string (a concise description of the anomaly in ${promptLang}. Use a translatable key format like 'adminDashboard_anomaly_X_description' if you can invent appropriate keys, otherwise plain text.)
- "recommendation": string (a brief, actionable recommendation for an admin in ${promptLang}. Use a translatable key format like 'adminDashboard_anomaly_X_recommendation' if you can invent keys, otherwise plain text.)
- "entityType": string (optional: "stock", "user", "demand", or "general")
- "entityId": string (optional: the ID of the stock item, user, or demand if applicable, e.g., "STK-123", "USER-456")
- "timestamp": string (current ISO date string, e.g., "${new Date().toISOString()}")

Return these objects as a JSON array. If no significant anomalies are found, return an empty JSON array [].
The response MUST ONLY contain the JSON array or an empty array. Do not include any other text or markdown.`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      const parsedResult = parseJsonArrayFromGeminiResponse<AnomalyReportItem>(response.text);

      if (typeof parsedResult === 'string') { 
        return parsedResult;
      }
      if (parsedResult.length === 0) {
        return t('adminDashboard_noAnomaliesFound');
      }
      return parsedResult.map(item => ({
        ...item,
        description: t(item.description as TranslationKey) === item.description ? item.description : t(item.description as TranslationKey),
        recommendation: t(item.recommendation as TranslationKey) === item.recommendation ? item.recommendation : t(item.recommendation as TranslationKey),
      }));

    } catch (error) {
      console.error("Error generating anomaly detection data with Gemini:", error);
      return t('adminUsers_error_aiFeatureGeneric');
    }
  };

  const handleGenerateSimulatedDataOnDashboard = () => {
    setIsLoading(prev => ({ ...prev, dataGeneration: true }));
    setState(prev => ({ ...prev, generatedDataReport: null }));

    let currentMockCompanies: MockCompany[] = JSON.parse(localStorage.getItem(MOCK_COMPANIES_STORAGE_KEY) || '[]');
    const productName = t('productType_acaciaDebarkedSandedPost' as TranslationKey); 
    const existingCompanyNames = new Set(currentMockCompanies.map(c => c.companyName.toLowerCase()));

    const scenarioCompanies = [
        { nameKey: "scenario_customer_A_name", role: UserRole.CUSTOMER },
        { nameKey: "scenario_customer_B_name", role: UserRole.CUSTOMER },
        { nameKey: "scenario_manufacturer_X_name", role: UserRole.MANUFACTURER },
        { nameKey: "scenario_manufacturer_Y_name", role: UserRole.MANUFACTURER },
        { nameKey: "scenario_manufacturer_Z_name", role: UserRole.MANUFACTURER },
    ];
    
    const sampleCitiesHu = [t('city_sample_2' as TranslationKey), t('city_sample_3' as TranslationKey), t('city_sample_4' as TranslationKey), t('city_sample_5' as TranslationKey), t('city_sample_6' as TranslationKey)];
    const sampleCitiesRo = [t('city_sample_1' as TranslationKey)];
    const sampleCountries = [t('country_sample_hu' as TranslationKey), t('country_sample_ro' as TranslationKey)]; 
    let scenarioCompanyObjects: Record<string, MockCompany> = {};
    
    let newCustomersCount = 0;
    let newManufacturersCount = 0;

    scenarioCompanies.forEach((sc, index) => {
        const companyName = t(sc.nameKey as TranslationKey);
        let company = currentMockCompanies.find(c => c.companyName === companyName);
        if (!company) {
            const country = sampleCountries[index % sampleCountries.length];
            const cityPool = country === t('country_sample_ro' as TranslationKey) ? sampleCitiesRo : sampleCitiesHu;
            company = {
                id: `comp-scen-${sc.role.slice(0,3).toLowerCase()}-${Date.now()}-${index}`,
                companyName: companyName,
                role: sc.role as UserRole.CUSTOMER | UserRole.MANUFACTURER,
                address: {
                    street: `${index + 1} Scenario St.`,
                    city: cityPool[index % cityPool.length],
                    zipCode: `${3000 + index * 10}`,
                    country: country,
                }
            };
            currentMockCompanies.push(company);
            existingCompanyNames.add(companyName.toLowerCase());
            if (sc.role === UserRole.CUSTOMER) newCustomersCount++;
            else if (sc.role === UserRole.MANUFACTURER) newManufacturersCount++;
        }
        scenarioCompanyObjects[sc.nameKey] = company;
    });

    const scenarioDemands: DemandItem[] = [
        { 
            id: `DEM-SCEN-A-${Date.now()}`, productName: productName, diameterType: 'mid', diameterFrom: '14', diameterTo: '18', length: '3', quantity: '166',
            cubicMeters: calculateVolume(14, 18, 3, 166), notes: t('scenario_demand_note_A' as TranslationKey), status: DemandStatus.RECEIVED,
            submissionDate: new Date().toISOString(), submittedByCompanyId: scenarioCompanyObjects["scenario_customer_A_name"].id,
            submittedByCompanyName: scenarioCompanyObjects["scenario_customer_A_name"].companyName
        },
        { 
            id: `DEM-SCEN-B-${Date.now()}`, productName: productName, diameterType: 'mid', diameterFrom: '12', diameterTo: '16', length: '2.5', quantity: '290',
            cubicMeters: calculateVolume(12, 16, 2.5, 290), notes: t('scenario_demand_note_B' as TranslationKey), status: DemandStatus.RECEIVED,
            submissionDate: new Date().toISOString(), submittedByCompanyId: scenarioCompanyObjects["scenario_customer_B_name"].id,
            submittedByCompanyName: scenarioCompanyObjects["scenario_customer_B_name"].companyName
        }
    ];

    const scenarioStockItems: StockItem[] = [
        { 
            id: `STK-SCEN-X-${Date.now()}`, productName: productName, diameterType: 'mid', diameterFrom: '14', diameterTo: '18', length: '3', quantity: '133',
            price: '22 EUR/db', cubicMeters: calculateVolume(14, 18, 3, 133), notes: t('scenario_stock_note_X' as TranslationKey),
            sustainabilityInfo: "PEFC", status: StockStatus.AVAILABLE, uploadDate: new Date().toISOString(),
            uploadedByCompanyId: scenarioCompanyObjects["scenario_manufacturer_X_name"].id,
            uploadedByCompanyName: scenarioCompanyObjects["scenario_manufacturer_X_name"].companyName
        },
        { 
            id: `STK-SCEN-Y-${Date.now()}`, productName: productName, diameterType: 'mid', diameterFrom: '12', diameterTo: '16', length: '2.5', quantity: '145',
            price: '19 EUR/db', cubicMeters: calculateVolume(12, 16, 2.5, 145), notes: t('scenario_stock_note_Y' as TranslationKey),
            sustainabilityInfo: "FSC Mix", status: StockStatus.AVAILABLE, uploadDate: new Date().toISOString(),
            uploadedByCompanyId: scenarioCompanyObjects["scenario_manufacturer_Y_name"].id,
            uploadedByCompanyName: scenarioCompanyObjects["scenario_manufacturer_Y_name"].companyName
        },
        { 
            id: `STK-SCEN-Z-${Date.now()}`, productName: productName, diameterType: 'mid', diameterFrom: '12', diameterTo: '16', length: '2.5', quantity: '186',
            price: '20 EUR/db', cubicMeters: calculateVolume(12, 16, 2.5, 186), notes: t('scenario_stock_note_Z' as TranslationKey),
            sustainabilityInfo: "Lokális kitermelés", status: StockStatus.AVAILABLE, uploadDate: new Date().toISOString(),
            uploadedByCompanyId: scenarioCompanyObjects["scenario_manufacturer_Z_name"].id,
            uploadedByCompanyName: scenarioCompanyObjects["scenario_manufacturer_Z_name"].companyName
        }
    ];
    
    let generatedDemands = [...scenarioDemands];
    let generatedStockItems = [...scenarioStockItems];
    let customers = currentMockCompanies.filter(c => c.role === UserRole.CUSTOMER);
    let manufacturers = currentMockCompanies.filter(c => c.role === UserRole.MANUFACTURER);
    const targetCompanyCount = 10; 

    for (let i = customers.length; i < targetCompanyCount; i++) {
        const country = sampleCountries[i % sampleCountries.length];
        const cityPool = country === t('country_sample_ro' as TranslationKey) ? sampleCitiesRo : sampleCitiesHu;
        const companyName = `${t('adminUsers_generatedMockCompanyPrefix' as TranslationKey)} ${t('userRole_CUSTOMER' as TranslationKey)} ${i + 1 + scenarioCompanies.filter(sc => sc.role === UserRole.CUSTOMER).length}`;
        if (existingCompanyNames.has(companyName.toLowerCase())) continue;
        const newCustomer: MockCompany = { 
            id: `comp-cust-rand-${Date.now()}-${i}`, companyName, role: UserRole.CUSTOMER,
            address: { street: `${i+1} Random St.`, city: cityPool[i % cityPool.length], zipCode: `${4000 + i * 10}`, country }
        };
        currentMockCompanies.push(newCustomer); customers.push(newCustomer); existingCompanyNames.add(companyName.toLowerCase()); newCustomersCount++;
    }
    for (let i = manufacturers.length; i < targetCompanyCount; i++) {
        const country = sampleCountries[(i+1) % sampleCountries.length];
        const cityPool = country === t('country_sample_ro' as TranslationKey) ? sampleCitiesRo : sampleCitiesHu;
        const companyName = `${t('adminUsers_generatedMockCompanyPrefix' as TranslationKey)} ${t('userRole_MANUFACTURER' as TranslationKey)} ${i + 1 + scenarioCompanies.filter(sc => sc.role === UserRole.MANUFACTURER).length}`;
        if (existingCompanyNames.has(companyName.toLowerCase())) continue;
        const newMan: MockCompany = { 
            id: `comp-man-rand-${Date.now()}-${i}`, companyName, role: UserRole.MANUFACTURER,
            address: { street: `${100+i} Random Rd.`, city: cityPool[i % cityPool.length], zipCode: `${5000 + i * 10}`, country }
        };
        currentMockCompanies.push(newMan); manufacturers.push(newMan); existingCompanyNames.add(companyName.toLowerCase()); newManufacturersCount++;
    }
    
    localStorage.setItem(MOCK_COMPANIES_STORAGE_KEY, JSON.stringify(currentMockCompanies)); // Save updated companies

    customers.forEach(customer => {
        if (scenarioDemands.some(sd => sd.submittedByCompanyId === customer.id)) return;
        const numDemands = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < numDemands; i++) {
            const dFrom = Math.floor(Math.random() * 8) + 8; const dTo = dFrom + Math.floor(Math.random() * 6) + 2;
            const len = (Math.random() * 3 + 2.5).toFixed(1); const qty = Math.floor(Math.random() * 91) + 10;
            generatedDemands.push({
                id: `DEM-RAND-${customer.id.slice(-4)}-${Date.now() + i}`, productName: productName, diameterType: 'mid',
                diameterFrom: String(dFrom), diameterTo: String(dTo), length: String(len), quantity: String(qty),
                cubicMeters: calculateVolume(dFrom, dTo, parseFloat(len), qty), status: DemandStatus.RECEIVED,
                submissionDate: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 7).toISOString(),
                submittedByCompanyId: customer.id, submittedByCompanyName: customer.companyName,
                notes: `${t('adminUsers_simulatedDemandNotePrefix' as TranslationKey)} ${productName}`
            });
        }
    });

    manufacturers.forEach(manufacturer => {
        if (scenarioStockItems.some(ss => ss.uploadedByCompanyId === manufacturer.id)) return;
        const numStock = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < numStock; i++) {
            const dFrom = Math.floor(Math.random() * 10) + 10; const dTo = dFrom + Math.floor(Math.random() * 7) + 3;
            const len = (Math.random() * 3.5 + 3).toFixed(1); const qty = Math.floor(Math.random() * 131) + 20;
            generatedStockItems.push({
                id: `STK-RAND-${manufacturer.id.slice(-4)}-${Date.now() + i}`, productName: productName, diameterType: 'mid',
                diameterFrom: String(dFrom), diameterTo: String(dTo), length: String(len), quantity: String(qty),
                price: `${(Math.random() * 40 + 15).toFixed(0)} EUR/db`,
                cubicMeters: calculateVolume(dFrom, dTo, parseFloat(len), qty), status: StockStatus.AVAILABLE,
                uploadDate: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 14).toISOString(),
                uploadedByCompanyId: manufacturer.id, uploadedByCompanyName: manufacturer.companyName,
                notes: `${t('adminUsers_simulatedStockNotePrefix' as TranslationKey)} ${productName}, ${t('adminUsers_simulatedStockQuality' as TranslationKey)}`,
                sustainabilityInfo: `${t('adminUsers_simulatedSustainabilityInfoPrefix' as TranslationKey)} FSC 100% ${t('adminUsers_simulatedSustainabilityInfoSuffix' as TranslationKey)}`
            });
        }
    });

    try {
        const existingDemandsRaw = localStorage.getItem(CUSTOMER_DEMANDS_STORAGE_KEY);
        const existingDemands: DemandItem[] = existingDemandsRaw ? JSON.parse(existingDemandsRaw) : [];
        localStorage.setItem(CUSTOMER_DEMANDS_STORAGE_KEY, JSON.stringify([...generatedDemands, ...existingDemands.filter(ed => !generatedDemands.find(gd => gd.id === ed.id))]));

        const existingStockRaw = localStorage.getItem(MANUFACTURER_STOCK_STORAGE_KEY);
        const existingStock: StockItem[] = existingStockRaw ? JSON.parse(existingStockRaw) : [];
        localStorage.setItem(MANUFACTURER_STOCK_STORAGE_KEY, JSON.stringify([...generatedStockItems, ...existingStock.filter(es => !generatedStockItems.find(gs => gs.id === es.id))]));
        
        setState(prev => ({ 
            ...prev, 
            dataGenerationLoading: false, 
            generatedDataReport: {
                newCustomers: newCustomersCount,
                newManufacturers: newManufacturersCount,
                newDemands: generatedDemands.length,
                newStockItems: generatedStockItems.length,
                productName: productName,
                scenarioInfo: t('adminUsers_dataGenerationReport_scenario_info' as TranslationKey)
            }
        }));
        loadDataForCharts(); // Refresh dashboard charts
        loadPlatformOverviewData(); // Refresh platform overview metrics
    } catch (error) {
        console.error("Error saving simulated data:", error);
        setState(prev => ({ ...prev, dataGenerationLoading: false, generatedDataReport: null }));
        alert(t('adminUsers_dataGenerationFailure'));
    }
  };

  const regionOptions = REGION_OPTIONS.map(opt => ({value: opt.value, label: t(opt.labelKey)}));
  const productTypeOptions = PRODUCT_TYPE_FORECAST_OPTIONS.map(opt => ({value: opt.value, label: t(opt.labelKey)}));
  
  const isGlobalLoading = Object.values(isLoading).some(val => val === true);

  return (
    <>
      <PageTitle title={t('adminDashboard_title')} subtitle={t('adminDashboard_subtitle')} icon={<ChartBarIcon className="h-8 w-8"/>} />
      
      {/* Platform At a Glance & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card title={t('adminDashboard_platformAtAGlanceTitle')} className="lg:col-span-2">
            {isLoading.platformOverview ? <LoadingSpinner text={t('adminDashboard_loadingOverview')} /> : state.platformOverview ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-slate-700/50 rounded">
                    <EyeIcon className="h-6 w-6 mx-auto text-sky-400 mb-1" />
                    <p className="text-2xl font-bold text-white">{state.platformOverview.totalActiveDemands}</p>
                    <p className="text-xs text-slate-400">{t('adminDashboard_activeDemandsMetric')}</p>
                </div>
                <div className="p-3 bg-slate-700/50 rounded">
                    <CubeIconOutline className="h-6 w-6 mx-auto text-emerald-400 mb-1" />
                    <p className="text-2xl font-bold text-white">{state.platformOverview.totalAvailableStock}</p>
                    <p className="text-xs text-slate-400">{t('adminDashboard_availableStockMetric')}</p>
                </div>
                <div className="p-3 bg-slate-700/50 rounded">
                    <UserGroupIconSolid className="h-6 w-6 mx-auto text-cyan-400 mb-1" />
                    <p className="text-2xl font-bold text-white">{state.platformOverview.totalCustomers}</p>
                    <p className="text-xs text-slate-400">{t('adminDashboard_totalCustomersMetric')}</p>
                </div>
                <div className="p-3 bg-slate-700/50 rounded">
                    <UserGroupIcon className="h-6 w-6 mx-auto text-teal-400 mb-1" />
                    <p className="text-2xl font-bold text-white">{state.platformOverview.totalManufacturers}</p>
                    <p className="text-xs text-slate-400">{t('adminDashboard_totalManufacturersMetric')}</p>
                </div>
                 <div className="p-3 bg-slate-700/50 rounded col-span-2 sm:col-span-1">
                    <CheckBadgeIconOutline className="h-6 w-6 mx-auto text-yellow-400 mb-1" />
                    <p className="text-2xl font-bold text-white">{state.platformOverview.successfulMatchesThisMonth}</p>
                    <p className="text-xs text-slate-400">{t('adminDashboard_successfulMatchesMetric')}</p>
                </div>
                 <div className="p-3 bg-slate-700/50 rounded col-span-2 sm:col-span-3">
                    <SparklesIconOutline className="h-6 w-6 mx-auto text-purple-400 mb-1" />
                    <p className="text-sm font-semibold text-slate-100 mb-1">{t('adminDashboard_aiPlatformInterpretationTitle')}</p>
                    <p className="text-xs text-slate-300 italic">{state.platformInterpretation || t('adminDashboard_loadingOverview')}</p>
                </div>
            </div>
            ) : <p>{t('adminDashboard_loadingOverview')}</p>}
        </Card>
        <Card title={t('adminDashboard_recentActivityTitle')} bodyClassName="max-h-[400px] overflow-y-auto custom-scrollbar">
            {isLoading.recentActivities ? <LoadingSpinner text={t('adminDashboard_loadingRecentActivity')} /> : state.recentActivities && state.recentActivities.length > 0 ? (
            <ul className="space-y-3">
                {state.recentActivities.map(activity => (
                <li key={activity.id} className="flex items-start space-x-3 text-xs">
                    <div className="flex-shrink-0 mt-0.5">{activity.icon || <InformationCircleIcon className="h-5 w-5 text-slate-500"/>}</div>
                    <div className="flex-grow">
                        <p className="text-slate-200">{t(activity.descriptionKey, activity.params)}</p>
                        <p className="text-slate-400">{new Date(activity.timestamp).toLocaleTimeString(locale, {hour:'2-digit', minute:'2-digit'})} - {new Date(activity.timestamp).toLocaleDateString(locale, {month:'short', day:'numeric'})}</p>
                    </div>
                </li>
                ))}
            </ul>
            ) : <p className="text-sm text-slate-400">{t('adminDashboard_noDataYet')}</p>}
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card title={t('adminDashboard_currentDemandStatuses')}>
          {isLoading.orderStatusSummary ? <LoadingSpinner text={t('adminDashboard_loadingStatuses')} /> : state.orderStatusSummary && state.totalDemandsCount ? (
            <SimpleBarChart data={state.orderStatusSummary.map(s => ({ label: getTranslatedDemandStatus(s.status, t), value: s.count, color: s.colorClass.replace('bg-', 'text-') }))} title={t('adminDashboard_demandStatusChartTitle')} />
          ) : <p>{t('adminDashboard_noDemandsYet')}</p>}
        </Card>
        <Card title={t('adminDashboard_currentStockStatuses')}>
          {isLoading.stockStatusSummary ? <LoadingSpinner text={t('adminDashboard_loadingStatuses')} /> : state.stockStatusSummary && state.totalStockItemsCount ? (
             <SimpleBarChart data={state.stockStatusSummary.map(s => ({ label: getTranslatedStockStatus(s.status, t), value: s.count, color: s.colorClass.replace('bg-', 'text-') }))} title={t('adminDashboard_stockStatusChartTitle')} />
          ) : <p>{t('adminDashboard_noStockYet')}</p>}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title={t('adminDashboard_topCustomersByVolumeTitle')}>
            {isLoading.topCustomers ? <LoadingSpinner text={t('adminDashboard_loadingTopCompanies')} /> : state.topCustomersByVolume && state.topCustomersByVolume.length > 0 ? (
            <SimpleBarChart data={state.topCustomersByVolume} />
            ) : <p>{t('adminDashboard_noDataYet')}</p>}
        </Card>
        <Card title={t('adminDashboard_topManufacturersByVolumeTitle')}>
            {isLoading.topManufacturers ? <LoadingSpinner text={t('adminDashboard_loadingTopCompanies')} /> : state.topManufacturersByVolume && state.topManufacturersByVolume.length > 0 ? (
            <SimpleBarChart data={state.topManufacturersByVolume} />
            ) : <p>{t('adminDashboard_noDataYet')}</p>}
        </Card>
      </div>
      
      <div className="mb-6">
        <Card title={t('adminUsers_generateSimulatedData')} className="mb-6">
            <p className="text-sm text-slate-300 mb-3">
                {t('adminUsers_generateSimulatedDataDescriptionSpecific' as TranslationKey, { productName: t('productType_acaciaDebarkedSandedPost' as TranslationKey) })}
            </p>
            <Button 
                onClick={handleGenerateSimulatedDataOnDashboard} 
                isLoading={isLoading.dataGeneration}
                leftIcon={<BeakerIcon className="h-5 w-5" />}
            >
                {t('adminUsers_generateAcaciaDataButton' as TranslationKey, {productName: t('productType_acaciaDebarkedSandedPost' as TranslationKey)})}
            </Button>
            {isLoading.dataGeneration && <div className="mt-2"><LoadingSpinner text={t('adminUsers_dataGenerationInProgress')}/></div>}
            {state.generatedDataReport && !isLoading.dataGeneration && (
                <div className="mt-4 p-3 bg-slate-700 rounded text-sm">
                    <h4 className="font-semibold text-cyan-300 mb-1">{t('adminUsers_dataGenerationReport_title')}</h4>
                    <p>{t('adminUsers_dataGenerationReport_product' as TranslationKey, {productName: state.generatedDataReport.productName})}</p>
                    <p>{t('adminUsers_dataGenerationReport_companies' as TranslationKey, {customerCount: state.generatedDataReport.newCustomers, manufacturerCount: state.generatedDataReport.newManufacturers})}</p>
                    <p>{t('adminUsers_dataGenerationReport_demands' as TranslationKey, {demandCount: state.generatedDataReport.newDemands})}</p>
                    <p>{t('adminUsers_dataGenerationReport_stock' as TranslationKey, {stockCount: state.generatedDataReport.newStockItems})}</p>
                    {state.generatedDataReport.scenarioInfo && <p className="text-xs text-amber-300 mt-1">{state.generatedDataReport.scenarioInfo}</p>}
                    <p className="text-xs text-slate-400 mt-1">{t('adminUsers_dataGenerationReport_info')}</p>
                </div>
            )}
        </Card>
      </div>


      <Card title={t('adminDashboard_anomalyDetection')} className="mb-6">
        <p className="text-sm text-slate-300 mb-3">{t('adminDashboard_anomalyDetectionDescription')}</p>
        <AiFeatureButton
          text={t('adminDashboard_checkAnomalies')}
          onClick={() => handleAiFeatureClick('detectedAnomalies', generateAnomalyDetectionData)}
          isLoading={isLoading.detectedAnomalies}
          leftIcon={<BellAlertIcon className="h-5 w-5 text-red-400" />}
          disabled={!ai || isGlobalLoading}
        />
        {isLoading.detectedAnomalies && <LoadingSpinner text={t('adminDashboard_detectingAnomalies')} />}
        {state.detectedAnomalies && !isLoading.detectedAnomalies && (
          <div className="mt-4">
            <h4 className="text-md font-semibold text-cyan-300 mb-2">{t('adminDashboard_anomalyDetectionResults')}</h4>
            {typeof state.detectedAnomalies === 'string' ? (
              <p className="text-slate-300">{state.detectedAnomalies}</p>
            ) : state.detectedAnomalies.length === 0 ? (
              <p className="text-slate-300">{t('adminDashboard_noAnomaliesFound')}</p>
            ) : (
              <ul className="space-y-3">
                {state.detectedAnomalies.map(anomaly => (
                  <li key={anomaly.id} className={`p-3 rounded-md shadow-sm border-l-4 ${
                    anomaly.severity === AnomalySeverity.HIGH ? 'border-red-500 bg-red-900/30' : 
                    anomaly.severity === AnomalySeverity.MEDIUM ? 'border-yellow-500 bg-yellow-900/30' : 
                    'border-sky-500 bg-sky-900/30'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">{AnomalySeverityIconMap[anomaly.severity]}</div>
                      <div className="flex-grow">
                        <p className="text-sm font-semibold text-slate-100">{getAnomalyTypeText(anomaly.type)} - {getAnomalySeverityText(anomaly.severity)}</p>
                        <p className="text-xs text-slate-300">{anomaly.description}</p>
                        <p className="text-xs text-amber-300 mt-1"><strong>{t('adminDashboard_anomaly_recommendation')}:</strong> {anomaly.recommendation}</p>
                        {anomaly.entityId && <p className="text-[10px] text-slate-400 mt-0.5">{t('adminDashboard_anomaly_entityId')}: {anomaly.entityId} ({anomaly.entityType})</p>}
                        <p className="text-[10px] text-slate-500">{new Date(anomaly.timestamp).toLocaleString(locale)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title={t('adminDashboard_userActivitySummary')}>
            {isLoading.userActivitySummary ? <LoadingSpinner text={t('adminDashboard_loadingActivity')} /> : state.userActivitySummary ? (
                <>
                <h4 className="text-sm font-semibold text-cyan-300 mb-2">{t('adminDashboard_newRegistrations')}</h4>
                <SimpleBarChart data={state.userActivitySummary.newRegistrations.map(d => ({ label: d.date, value: d.count, color: 'text-green-400' }))} />
                <h4 className="text-sm font-semibold text-cyan-300 mt-4 mb-2">{t('adminDashboard_activeUsersByRole')}</h4>
                <SimpleBarChart data={state.userActivitySummary.activeByRole.map(r => ({ label: getTranslatedUserRole(r.role, t), value: r.count, color: 'text-purple-400' }))} />
                </>
            ) : <p>{t('adminDashboard_noDataYet')}</p>}
        </Card>
        <Card title={t('adminDashboard_systemHealthStatus')}>
          <AiFeatureButton
            text={t('adminDashboard_loadSystemHealth')}
            onClick={() => handleAiFeatureClick('systemHealthStatuses', () => MOCK_AI_RESPONSES.systemHealthStatuses)}
            isLoading={isLoading.systemHealthStatuses}
            leftIcon={<CheckCircleIcon className="h-5 w-5 text-green-400" />}
            disabled={isGlobalLoading}
          />
          {isLoading.systemHealthStatuses && <LoadingSpinner text={t('adminDashboard_loadingHealth')} />}
          {state.systemHealthStatuses && !isLoading.systemHealthStatuses && (
            <ul className="mt-3 space-y-2 text-sm">
              {state.systemHealthStatuses.map(item => (
                <li key={item.id} className={`flex items-center p-2 rounded ${
                  item.status === 'OK' ? 'bg-green-800/50' : item.status === 'Warning' ? 'bg-yellow-800/50' : 'bg-red-800/50'
                }`}>
                  {item.status === 'OK' ? <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2"/> : 
                   item.status === 'Warning' ? <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2"/> :
                   <XCircleIcon className="h-5 w-5 text-red-400 mr-2"/>}
                  <span className="font-medium text-slate-200">{item.componentName}: {item.status}</span>
                  {item.details && <span className="text-xs text-slate-300 ml-2">({item.details})</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Other AI Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card title={t('adminDashboard_marketNews')}>
          <AiFeatureButton text={t('adminDashboard_loadMarketNews')} onClick={() => handleAiFeatureClick('marketNews', () => MOCK_AI_RESPONSES.marketNews)} isLoading={isLoading.marketNews} leftIcon={<NewspaperIcon className="h-5 w-5"/>} disabled={!ai || isGlobalLoading}/>
          {isLoading.marketNews && <LoadingSpinner text={t('adminDashboard_loadingNews')} />}
          {state.marketNews && !isLoading.marketNews && (
            <ul className="mt-3 space-y-2 text-sm">
              {state.marketNews.map(news => <li key={news.id} className="p-2 bg-slate-700/50 rounded"><strong>{news.title}:</strong> {news.content} <span className="text-xs text-slate-400">({news.date})</span></li>)}
            </ul>
          )}
        </Card>

        <Card title={t('adminDashboard_marketInfoQuery')}>
          <Input label={t('adminDashboard_marketQueryLabel')} name="marketInfoQuery" value={state.marketInfoQuery || ''} onChange={handleInputChange} placeholder={t('adminDashboard_marketQueryPlaceholder')} />
          <AiFeatureButton text={t('adminDashboard_getMarketInfo')} onClick={() => handleAiFeatureClick('marketInfoResponse', () => MOCK_AI_RESPONSES.marketInfoResponse)} isLoading={isLoading.marketInfoResponse} disabled={!ai || !state.marketInfoQuery || isGlobalLoading} />
          {isLoading.marketInfoResponse && <LoadingSpinner text={t('adminDashboard_fetchingInfo')} />}
          {state.marketInfoResponse && !isLoading.marketInfoResponse && <p className="mt-3 text-sm p-2 bg-slate-700/50 rounded"><strong>{t('adminDashboard_aiResponse')}:</strong> {state.marketInfoResponse}</p>}
        </Card>
        
        <Card title={t('adminDashboard_feedbackAnalysis')}>
            <Textarea label={t('adminDashboard_userFeedbackLabel')} name="feedbackText" value={state.feedbackText || ''} onChange={handleInputChange} placeholder={t('adminDashboard_userFeedbackPlaceholder')} rows={3}/>
            <AiFeatureButton text={t('adminDashboard_analyzeFeedback')} onClick={() => handleAiFeatureClick('feedbackAnalysis', () => MOCK_AI_RESPONSES.feedbackAnalysis)} isLoading={isLoading.feedbackAnalysis} disabled={!ai || !state.feedbackText || isGlobalLoading} leftIcon={<ChatBubbleBottomCenterTextIcon className="h-5 w-5"/>}/>
            {isLoading.feedbackAnalysis && <LoadingSpinner text={t('adminDashboard_analyzing')} />}
            {state.feedbackAnalysis && !isLoading.feedbackAnalysis && (
                <div className="mt-3 text-xs p-2 bg-slate-700/50 rounded space-y-1">
                    <p><strong>{t('adminDashboard_positive')}</strong> {state.feedbackAnalysis.positive}%</p>
                    <p><strong>{t('adminDashboard_neutral')}</strong> {state.feedbackAnalysis.neutral}%</p>
                    <p><strong>{t('adminDashboard_negative')}</strong> {state.feedbackAnalysis.negative}%</p>
                    <p><strong>{t('adminDashboard_summary')}</strong> {state.feedbackAnalysis.summary}</p>
                    {state.feedbackAnalysis.keyThemes && <p><strong>{t('adminDashboard_keyThemes')}</strong> {state.feedbackAnalysis.keyThemes.join(', ')}</p>}
                    {state.feedbackAnalysis.improvementSuggestions && <p><strong>{t('adminDashboard_improvementSuggestions')}</strong> {state.feedbackAnalysis.improvementSuggestions.join('; ')}</p>}
                </div>
            )}
        </Card>

        <Card title={t('adminDashboard_demandForecast')}>
            <Select label={t('adminDashboard_regionLabel')} name="forecastRegion" value={state.forecastRegion || ''} onChange={handleInputChange} options={regionOptions}/>
            <Select label={t('adminDashboard_productTypeLabel')} name="forecastProductType" value={state.forecastProductType || ''} onChange={handleInputChange} options={productTypeOptions}/>
            <AiFeatureButton text={t('adminDashboard_generateForecast')} onClick={() => handleAiFeatureClick('demandForecast', () => ({...MOCK_AI_RESPONSES.demandForecast, region: state.forecastRegion || 'N/A', productType: state.forecastProductType || 'N/A'}))} isLoading={isLoading.demandForecast} disabled={!ai || !state.forecastRegion || !state.forecastProductType || isGlobalLoading} leftIcon={<MapIcon className="h-5 w-5"/>}/>
            {isLoading.demandForecast && <LoadingSpinner text={t('adminDashboard_forecasting')} />}
            {state.demandForecast && !isLoading.demandForecast && (
                <div className="mt-3 text-sm p-2 bg-slate-700/50 rounded">
                    <h5 className="font-semibold text-cyan-300">{t('adminDashboard_forecastFor', {productType: state.demandForecast.productType, region: state.demandForecast.region, timePeriod: state.demandForecast.timePeriod})}</h5>
                    <p>{state.demandForecast.forecastValue}{state.demandForecast.forecastUnit} {t(`adminDashboard_forecastDirection_${state.demandForecast.forecastDirection}`)}</p>
                    {state.demandForecast.reason && <p className="text-xs"><strong>{t('adminDashboard_reason')}</strong> {state.demandForecast.reason}</p>}
                </div>
            )}
        </Card>
        
        <GeminiAssistantWidget />

      </div>
    </>
  );
};
