
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageTitle from '../../../components/PageTitle';
import Card from '../../../components/Card';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Button from '../../../components/Button';
import { MockCompany, StockItem, StockStatus } from '../../../types';
import { MOCK_COMPANIES_STORAGE_KEY, MANUFACTURER_STOCK_STORAGE_KEY } from '../../../constants';
import { useLocale } from '../../../LocaleContext';
import { getTranslatedUserRole, getTranslatedStockStatus } from '../../../locales';
import { ArrowLeftIcon, BuildingOffice2Icon, EnvelopeIcon, PhoneIcon, MapPinIcon, CalendarDaysIcon, HashtagIcon, ArchiveBoxIcon, BeakerIcon, DocumentTextIcon, BanknotesIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const AdminManufacturerLogisticsDetailsPage: React.FC = () => {
  const { manufacturerId } = useParams<{ manufacturerId: string }>();
  const navigate = useNavigate();
  const { t, locale } = useLocale();

  const [manufacturer, setManufacturer] = useState<MockCompany | null>(null);
  const [manufacturerStock, setManufacturerStock] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    try {
      const companiesRaw = localStorage.getItem(MOCK_COMPANIES_STORAGE_KEY);
      const stockRaw = localStorage.getItem(MANUFACTURER_STOCK_STORAGE_KEY);

      if (companiesRaw) {
        const allCompanies: MockCompany[] = JSON.parse(companiesRaw);
        const foundManufacturer = allCompanies.find(c => c.id === manufacturerId);
        setManufacturer(foundManufacturer || null);
      }

      if (stockRaw) {
        const allStock: StockItem[] = JSON.parse(stockRaw);
        const filteredStock = allStock
          .filter(s => s.uploadedByCompanyId === manufacturerId)
          .sort((a, b) => new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime());
        setManufacturerStock(filteredStock);
      }
    } catch (error) {
      console.error("Error loading manufacturer details:", error);
      setManufacturer(null);
    }
    setIsLoading(false);
  }, [manufacturerId]);

  const getStatusBadgeColor = (status?: StockStatus): string => {
    if(!status) return 'bg-slate-500 text-slate-50';
    switch (status) {
      case StockStatus.AVAILABLE: return 'bg-green-600 text-green-50';
      case StockStatus.RESERVED: return 'bg-yellow-500 text-yellow-50';
      case StockStatus.SOLD: return 'bg-red-600 text-red-50';
      default: return 'bg-slate-500 text-slate-50';
    }
  };

  if (isLoading) {
    return <LoadingSpinner text={t('logisticsHub_loadingManufacturerDetails')} />;
  }

  if (!manufacturer) {
    return (
      <div className="p-4">
        <PageTitle title={t('logisticsHub_manufacturerNotFound_title')} />
        <Card>
          <p>{t('logisticsHub_manufacturerNotFound_message', { manufacturerId: manufacturerId || 'N/A' })}</p>
           <Button onClick={() => navigate(-1)} leftIcon={<ArrowLeftIcon className="h-5 w-5"/>} className="mt-4">
            {t('logisticsHub_backButton')}
          </Button>
        </Card>
      </div>
    );
  }
  
  const pageTitle = t('logisticsHub_manufacturerDetails_title_page', { companyName: manufacturer.companyName });


  return (
    <>
      <PageTitle title={pageTitle} icon={<BuildingOffice2Icon className="h-8 w-8" />} />
       <Button onClick={() => navigate(-1)} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>} className="mb-6">
        {t('logisticsHub_backButton')}
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card title={t('logisticsHub_companyInfoTitle')} className="md:col-span-1">
          <div className="space-y-2 text-sm">
            <p><strong className="text-slate-300">{t('adminUsers_companyName')}:</strong> <span className="text-cyan-300">{manufacturer.companyName}</span></p>
            <p><strong className="text-slate-300">{t('adminUsers_role')}:</strong> <span className="text-slate-100">{getTranslatedUserRole(manufacturer.role, t)}</span></p>
            {manufacturer.contactPerson && <p><strong className="text-slate-300">{t('logisticsHub_contactPerson')}:</strong> <span className="text-slate-100">{manufacturer.contactPerson}</span></p>}
            {manufacturer.email && <p className="flex items-center"><EnvelopeIcon className="h-4 w-4 mr-2 text-slate-400"/><strong className="text-slate-300">{t('logisticsHub_email')}:</strong> <a href={`mailto:${manufacturer.email}`} className="text-cyan-400 hover:underline ml-1">{manufacturer.email}</a></p>}
             <p className="flex items-center"><PhoneIcon className="h-4 w-4 mr-2 text-slate-400"/><strong className="text-slate-300">{t('logisticsHub_phone')}:</strong> <span className="text-slate-100">{t('logisticsHub_data_not_available_short')}</span></p> 
            {manufacturer.address && (
              <div className="pt-2 border-t border-slate-700">
                <p className="flex items-start"><MapPinIcon className="h-4 w-4 mr-2 mt-0.5 text-slate-400 shrink-0"/><strong className="text-slate-300">{t('logisticsHub_address')}:</strong></p>
                <address className="text-slate-100 not-italic ml-6">
                  {manufacturer.address.street && <span>{manufacturer.address.street}<br/></span>}
                  {manufacturer.address.zipCode && <span>{manufacturer.address.zipCode} </span>}
                  {manufacturer.address.city && <span>{manufacturer.address.city}<br/></span>}
                  {manufacturer.address.country && <span>{manufacturer.address.country}</span>}
                </address>
              </div>
            )}
          </div>
        </Card>

        <Card title={t('logisticsHub_currentStockTitle')} className="md:col-span-2">
          {manufacturerStock.length === 0 ? (
            <p className="text-slate-400">{t('logisticsHub_noStockFoundForManufacturer')}</p>
          ) : (
             <div className="max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
                <ul className="space-y-4">
                    {manufacturerStock.map(stock => (
                    <li key={stock.id} className="p-4 bg-slate-700/70 rounded-lg shadow">
                        <div className="flex justify-between items-start mb-2">
                        <h4 className="text-md font-semibold text-emerald-300 flex items-center">
                            <HashtagIcon className="h-5 w-5 mr-1.5 text-emerald-400" />
                            {t('manufacturerMyStock_stockId')}: {stock.id}
                        </h4>
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(stock.status)}`}>
                            {getTranslatedStockStatus(stock.status, t)}
                        </span>
                        </div>
                        <div className="text-xs space-y-1">
                        {stock.uploadDate && 
                            <p className="flex items-center text-slate-300">
                            <CalendarDaysIcon className="h-4 w-4 mr-1.5 text-slate-400" />
                            {t('manufacturerMyStock_uploaded')}: {new Date(stock.uploadDate).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        }
                        <p className="flex items-start text-slate-200">
                            <ArchiveBoxIcon className="h-4 w-4 mr-1.5 text-slate-400 shrink-0 mt-px" />
                            <span><strong className="font-medium">{stock.productName || t('logisticsHub_genericProduct')}:</strong> {stock.diameterType}, Ø{stock.diameterFrom}-{stock.diameterTo}cm, {t('customerNewDemand_length')}: {stock.length}m, {stock.quantity}pcs</span>
                        </p>
                        <p className="flex items-center text-slate-200">
                            <BeakerIcon className="h-4 w-4 mr-1.5 text-slate-400" />
                            <span>{t('customerMyDemands_cubicMeters')}: {stock.cubicMeters?.toFixed(3) || 'N/A'} m³</span>
                        </p>
                         {stock.price && 
                            <p className="flex items-center text-slate-200">
                            <BanknotesIcon className="h-4 w-4 mr-1.5 text-slate-400" />
                            <span>{t('manufacturerMyStock_price')}: {stock.price}</span>
                            </p>
                         }
                         {stock.sustainabilityInfo && 
                            <p className="flex items-start text-slate-200">
                            <ShieldCheckIcon className="h-4 w-4 mr-1.5 text-slate-400 shrink-0 mt-px" />
                            <span>{t('manufacturerMyStock_sustainability')}: {stock.sustainabilityInfo}</span>
                            </p>
                         }
                        {stock.notes && (
                            <p className="flex items-start text-slate-300 italic pt-1 border-t border-slate-600/50 mt-1.5">
                            <DocumentTextIcon className="h-4 w-4 mr-1.5 text-slate-400 shrink-0 mt-px" /> "{stock.notes}"
                            </p>
                        )}
                        </div>
                    </li>
                    ))}
                </ul>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

export default AdminManufacturerLogisticsDetailsPage;
