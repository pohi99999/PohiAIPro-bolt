
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageTitle from '../../../components/PageTitle';
import Card from '../../../components/Card';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Button from '../../../components/Button';
import { MockCompany, DemandItem, DemandStatus } from '../../../types';
import { MOCK_COMPANIES_STORAGE_KEY, CUSTOMER_DEMANDS_STORAGE_KEY } from '../../../constants';
import { useLocale } from '../../../LocaleContext';
import { getTranslatedUserRole, getTranslatedDemandStatus } from '../../../locales';
import { ArrowLeftIcon, BuildingOffice2Icon, EnvelopeIcon, PhoneIcon, MapPinIcon, CalendarDaysIcon, HashtagIcon, ArchiveBoxIcon, BeakerIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const AdminCustomerLogisticsDetailsPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { t, locale } = useLocale();

  const [customer, setCustomer] = useState<MockCompany | null>(null);
  const [customerDemands, setCustomerDemands] = useState<DemandItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    try {
      const companiesRaw = localStorage.getItem(MOCK_COMPANIES_STORAGE_KEY);
      const demandsRaw = localStorage.getItem(CUSTOMER_DEMANDS_STORAGE_KEY);

      if (companiesRaw) {
        const allCompanies: MockCompany[] = JSON.parse(companiesRaw);
        const foundCustomer = allCompanies.find(c => c.id === customerId);
        setCustomer(foundCustomer || null);
      }

      if (demandsRaw) {
        const allDemands: DemandItem[] = JSON.parse(demandsRaw);
        const filteredDemands = allDemands
          .filter(d => d.submittedByCompanyId === customerId)
          .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
        setCustomerDemands(filteredDemands);
      }
    } catch (error) {
      console.error("Error loading customer details:", error);
      setCustomer(null); // Ensure customer is null on error
    }
    setIsLoading(false);
  }, [customerId]);

  const getStatusBadgeColor = (status: DemandStatus): string => {
    switch (status) {
      case DemandStatus.RECEIVED: return 'bg-sky-500 text-sky-50';
      case DemandStatus.PROCESSING: return 'bg-amber-500 text-amber-50';
      case DemandStatus.COMPLETED: return 'bg-green-500 text-green-50';
      case DemandStatus.CANCELLED: return 'bg-red-500 text-red-50';
      default: return 'bg-slate-500 text-slate-50';
    }
  };


  if (isLoading) {
    return <LoadingSpinner text={t('logisticsHub_loadingCustomerDetails')} />;
  }

  if (!customer) {
    return (
      <div className="p-4">
        <PageTitle title={t('logisticsHub_customerNotFound_title')} />
        <Card>
          <p>{t('logisticsHub_customerNotFound_message', { customerId: customerId || 'N/A' })}</p>
          <Button onClick={() => navigate(-1)} leftIcon={<ArrowLeftIcon className="h-5 w-5"/>} className="mt-4">
            {t('logisticsHub_backButton')}
          </Button>
        </Card>
      </div>
    );
  }
  
  const pageTitle = t('logisticsHub_customerDetails_title_page', { companyName: customer.companyName });

  return (
    <>
      <PageTitle title={pageTitle} icon={<BuildingOffice2Icon className="h-8 w-8" />} />
      <Button onClick={() => navigate(-1)} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>} className="mb-6">
        {t('logisticsHub_backButton')}
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card title={t('logisticsHub_companyInfoTitle')} className="md:col-span-1">
          <div className="space-y-2 text-sm">
            <p><strong className="text-slate-300">{t('adminUsers_companyName')}:</strong> <span className="text-cyan-300">{customer.companyName}</span></p>
            <p><strong className="text-slate-300">{t('adminUsers_role')}:</strong> <span className="text-slate-100">{getTranslatedUserRole(customer.role, t)}</span></p>
            {customer.contactPerson && <p><strong className="text-slate-300">{t('logisticsHub_contactPerson')}:</strong> <span className="text-slate-100">{customer.contactPerson}</span></p>}
            {customer.email && <p className="flex items-center"><EnvelopeIcon className="h-4 w-4 mr-2 text-slate-400"/><strong className="text-slate-300">{t('logisticsHub_email')}:</strong> <a href={`mailto:${customer.email}`} className="text-cyan-400 hover:underline ml-1">{customer.email}</a></p>}
            {/* Phone number placeholder */}
            <p className="flex items-center"><PhoneIcon className="h-4 w-4 mr-2 text-slate-400"/><strong className="text-slate-300">{t('logisticsHub_phone')}:</strong> <span className="text-slate-100">{t('logisticsHub_data_not_available_short')}</span></p> 
            {customer.address && (
              <div className="pt-2 border-t border-slate-700">
                <p className="flex items-start"><MapPinIcon className="h-4 w-4 mr-2 mt-0.5 text-slate-400 shrink-0"/><strong className="text-slate-300">{t('logisticsHub_address')}:</strong></p>
                <address className="text-slate-100 not-italic ml-6">
                  {customer.address.street && <span>{customer.address.street}<br/></span>}
                  {customer.address.zipCode && <span>{customer.address.zipCode} </span>}
                  {customer.address.city && <span>{customer.address.city}<br/></span>}
                  {customer.address.country && <span>{customer.address.country}</span>}
                </address>
              </div>
            )}
          </div>
        </Card>

        <Card title={t('logisticsHub_orderHistoryTitle')} className="md:col-span-2">
          {customerDemands.length === 0 ? (
            <p className="text-slate-400">{t('logisticsHub_noDemandsFoundForCustomer')}</p>
          ) : (
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
              <ul className="space-y-4">
                {customerDemands.map(demand => (
                  <li key={demand.id} className="p-4 bg-slate-700/70 rounded-lg shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-md font-semibold text-sky-300 flex items-center">
                        <HashtagIcon className="h-5 w-5 mr-1.5 text-sky-400" />
                        {t('customerMyDemands_demandId')}: {demand.id}
                      </h4>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(demand.status)}`}>
                        {getTranslatedDemandStatus(demand.status, t)}
                      </span>
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="flex items-center text-slate-300">
                        <CalendarDaysIcon className="h-4 w-4 mr-1.5 text-slate-400" />
                        {t('customerMyDemands_submitted')}: {new Date(demand.submissionDate).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="flex items-start text-slate-200">
                        <ArchiveBoxIcon className="h-4 w-4 mr-1.5 text-slate-400 shrink-0 mt-px" />
                        <span><strong className="font-medium">{demand.productName || t('logisticsHub_genericProduct')}:</strong> {demand.diameterType}, Ø{demand.diameterFrom}-{demand.diameterTo}cm, {t('customerNewDemand_length')}: {demand.length}m, {demand.quantity}pcs</span>
                      </p>
                      <p className="flex items-center text-slate-200">
                        <BeakerIcon className="h-4 w-4 mr-1.5 text-slate-400" />
                        <span>{t('customerMyDemands_cubicMeters')}: {demand.cubicMeters?.toFixed(3) || 'N/A'} m³</span>
                      </p>
                      {demand.notes && (
                        <p className="flex items-start text-slate-300 italic pt-1 border-t border-slate-600/50 mt-1.5">
                           <DocumentTextIcon className="h-4 w-4 mr-1.5 text-slate-400 shrink-0 mt-px" /> "{demand.notes}"
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

export default AdminCustomerLogisticsDetailsPage;
