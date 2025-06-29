import React from 'react';
import { LoadingPlanItem } from '../types';
import { useLocale } from '../LocaleContext';
import Card from '../components/Card'; 

interface VisualTruckLoadProps {
  items: LoadingPlanItem[];
  truckCapacityM3?: number; 
  planDetails?: string;
}

const ITEM_COLORS = [
  'fill-cyan-600', 'fill-blue-600', 'fill-indigo-600', 
  'fill-purple-600', 'fill-pink-600', 'fill-rose-600',
  'fill-sky-600', 'fill-teal-600', 'fill-emerald-600',
  'fill-lime-600', 'fill-amber-600', 'fill-orange-600'
];

const VisualTruckLoad: React.FC<VisualTruckLoadProps> = ({ items, truckCapacityM3 = 25, planDetails }) => {
  const { t } = useLocale();

  if (!items || items.length === 0) {
    return (
      <Card title={t('adminTruckPlanning_visualTruck_title')} className="bg-slate-800 shadow-lg">
         <div className="text-center text-slate-400 py-4">{t('adminTruckPlanning_visualTruck_noItems')}</div>
      </Card>
    );
  }

  const truckWidth = 600; 
  const truckHeight = 100; 
  const padding = 5;
  const usableWidth = truckWidth - 2 * padding;
  const usableHeight = truckHeight - 2 * padding;
  
  // Calculate dynamic legend height based on number of unique destinations
  const uniqueDestinations = Array.from(new Set(items.map(item => item.destinationName || t('status_unknown'))));
  const legendItemHeight = 22; // Increased for larger font
  const legendVerticalPadding = 5;
  const legendTitleHeight = 20;
  const legendHeight = uniqueDestinations.length * legendItemHeight + legendTitleHeight + (2 * legendVerticalPadding);


  const sortedItems = [...items].sort((a, b) => {
    if (a.dropOffOrder !== undefined && b.dropOffOrder !== undefined) {
      return (b.dropOffOrder || 0) - (a.dropOffOrder || 0); 
    }
    return 0;
  });

  let totalVolumeLoaded = 0;
  sortedItems.forEach(item => {
    const volumeStr = String(item.volumeM3 || '0').replace(/[^\d.-]/g, '');
    totalVolumeLoaded += parseFloat(volumeStr);
  });
  
  const totalVolumeToDisplay = Math.max(totalVolumeLoaded, truckCapacityM3); 

  let currentX = padding; 

  // Map unique destination names to colors
  const destinationColorMap = new Map<string, string>();
  uniqueDestinations.forEach((dest, index) => {
    destinationColorMap.set(dest, ITEM_COLORS[index % ITEM_COLORS.length]);
  });

  return (
    <Card title={t('adminTruckPlanning_visualTruck_title')} className="bg-slate-800 shadow-lg">
      <div className="p-4">
        {planDetails && <p className="text-sm text-slate-300 mb-3">{planDetails}</p>}
        <p className="text-sm text-slate-400 mb-1"> {/* Increased from text-xs */}
          {t('adminTruckPlanning_visualTruck_simulatedView')}
        </p>
        <p className="text-sm text-slate-400 mb-3"> {/* Increased from text-xs */}
          {t('adminTruckPlanning_visualTruck_totalVolumeLoaded', { volume: totalVolumeLoaded.toFixed(2) })} / {truckCapacityM3} m³ 
          ({((totalVolumeLoaded / truckCapacityM3) * 100).toFixed(1) + '%'})
        </p>

        <svg viewBox={`0 0 ${truckWidth} ${truckHeight + legendHeight}`} width="100%" preserveAspectRatio="xMidYMid meet" aria-labelledby="truck-load-title">
          <title id="truck-load-title">{t('adminTruckPlanning_visualTruck_svgTitle')}</title>
          
          <rect x="0" y="0" width={truckWidth} height={truckHeight} className="fill-slate-700 stroke-slate-500" strokeWidth="1" rx="5" ry="5" />
          <text x={truckWidth / 2} y={truckHeight / 2} dy=".3em" textAnchor="middle" className="text-sm fill-slate-500 opacity-50 select-none"> {/* Increased from text-xs */}
            {t('adminTruckPlanning_visualTruck_truckBedArea')}
          </text>
           <text x={padding + 5} y={truckHeight - padding - 5} className="text-sm fill-slate-400">{t('adminTruckPlanning_visualTruck_cabEnd')}</text> {/* Increased from text-xs */}
           <text x={truckWidth - padding - 5} y={truckHeight - padding - 5} textAnchor="end" className="text-sm fill-slate-400">{t('adminTruckPlanning_visualTruck_doorEnd')}</text> {/* Increased from text-xs */}

          {sortedItems.map((item, index) => {
            const itemVolume = parseFloat(String(item.volumeM3 || '0').replace(/[^\d.-]/g, ''));
            const itemWidth = totalVolumeToDisplay > 0 ? (itemVolume / totalVolumeToDisplay) * usableWidth : 0;
            const itemHeight = usableHeight * 0.8; 
            
            if (itemWidth <= 0 || currentX + itemWidth > usableWidth + padding + 1) {
              console.warn("Item skipped due to zero/negative volume or simple packing overflow:", item.name, item.volumeM3);
              return null;
            }

            const itemColorClass = destinationColorMap.get(item.destinationName || t('status_unknown')) || ITEM_COLORS[uniqueDestinations.length % ITEM_COLORS.length];

            const itemElement = (
              <g key={`item-${index}`} transform={`translate(${currentX}, ${padding + (usableHeight - itemHeight) / 2})`}>
                <rect
                  width={itemWidth}
                  height={itemHeight}
                  className={`${itemColorClass} stroke-slate-400`}
                  strokeWidth="0.5"
                  rx="2"
                  ry="2"
                >
                  <title>{`${item.name} (${item.volumeM3 || 'N/A'} m³)${item.destinationName ? ` - ${t('adminTruckPlanning_visualTruck_destination')}: ${item.destinationName}` : ''}${item.dropOffOrder !== undefined ? ` (${t('adminTruckPlanning_visualTruck_dropOrder')}: ${item.dropOffOrder})` : ''}`}</title>
                </rect>
                {itemWidth > 50 && ( // Adjusted threshold for larger text
                  <text
                    x={itemWidth / 2}
                    y={itemHeight / 2}
                    dy=".3em"
                    textAnchor="middle"
                    className="text-xs fill-white font-medium select-none pointer-events-none" // Increased from text-[8px] to text-xs (12px)
                  >
                    {item.dropOffOrder !== undefined ? `${item.dropOffOrder}. ` : ''} 
                    {item.destinationName ? item.destinationName.substring(0, itemWidth > 100 ? 12 : 6) + (item.destinationName.length > (itemWidth > 100 ? 12 : 6) ? '...' : '') : item.name.substring(0, itemWidth > 100 ? 12 : 6) + (item.name.length > (itemWidth > 100 ? 12 : 6) ? '...' : '')}
                  </text>
                )}
              </g>
            );
            currentX += itemWidth + (itemWidth > 0 ? 1 : 0); 
            return itemElement;
          })}

          <g transform={`translate(${padding}, ${truckHeight + legendVerticalPadding + legendTitleHeight})`}>
            <text x="0" y="-legendVerticalPadding" className="text-sm font-semibold fill-slate-300">{t('adminTruckPlanning_visualTruck_legend')}:</text> {/* Increased from text-xs */}
            {uniqueDestinations.map((destName, index) => (
              <g key={`legend-${index}`} transform={`translate(0, ${index * legendItemHeight})`}>
                <rect x="0" y="0" width="12" height="12" className={destinationColorMap.get(destName) || ITEM_COLORS[uniqueDestinations.length % ITEM_COLORS.length]} /> {/* Slightly larger rect */}
                <text x="18" y="9" className="text-xs fill-slate-300"> {/* Increased from text-[10px] */}
                  {destName}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </Card>
  );
};

export default VisualTruckLoad;