
import React, { useState, useCallback } from 'react';
import { useLocale } from '../../LocaleContext';
import { GenerateContentResponse } from "@google/genai";
import { ai } from '../../lib/gemini';

// Import shared components
import PageTitle from '../../components/PageTitle';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { TranslationKey } from '../../locales';

interface SearchResult {
  date: string;
  stumpage_price: string; 
  nofu: string; 
  score: number; 
  source_info?: string;
}

const AdminAiReportsPage: React.FC = () => {
  const { t, locale } = useLocale();
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [rawTextResult, setRawTextResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const parseGeminiJsonResponse = useCallback((jsonString: string): SearchResult[] | string => {
    let cleanedJsonString = jsonString.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleanedJsonString.match(fenceRegex);
    if (match && match[2]) {
      cleanedJsonString = match[2].trim();
    }

    try {
      const parsed = JSON.parse(cleanedJsonString);
      if (Array.isArray(parsed)) {
        const isValidStructure = parsed.every(item =>
            typeof item.date === 'string' &&
            typeof item.stumpage_price === 'string' &&
            typeof item.nofu === 'string' &&
            typeof item.score === 'number'
            // item.source_info is optional
        );
        if (isValidStructure) {
            return parsed as SearchResult[];
        } else if (parsed.length === 0) { 
            return [] as SearchResult[];
        } else {
            return t('adminAiReports_error_invalidJsonStructure', { rawResponse: cleanedJsonString.substring(0, 150) });
        }
      } else {
        return t('adminAiReports_error_notAJsonArray', { rawResponse: cleanedJsonString.substring(0, 150) });
      }
    } catch (e) {
      return t('adminAiReports_error_parsingFailed', { rawResponse: jsonString.substring(0, 150) });
    }
  }, [t]);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError(t('adminAiReports_error_enterSearchTerm'));
      return;
    }
    if (!ai) {
      setError(t('customerNewDemand_error_aiUnavailable'));
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setRawTextResult(null);

    const promptLang = locale === 'hu' ? 'Hungarian' : (locale === 'de' ? 'German' : 'English');
    const prompt = `You are an AI assistant specialized in analyzing a Hungarian timber market and pricing database.
The user is querying about: "${query}".
The database contains information including "date", "stumpage_price" (tőár in Ft/m³), and "nofu" (Hungarian timber classification code).
Please search for relevant information.
If you find specific data points, return them as a JSON array of objects. Each object should have the following fields:
- "date": string (e.g., "YYYY-MM-DD" or period like "2023 Q3")
- "stumpage_price": string (e.g., "35000 Ft/m³")
- "nofu": string (the NOFU code, e.g., "01.2A")
- "score": number (a relevance score between 0.0 and 1.0 for this data point to the query)
- "source_info": string (optional, brief context if available, e.g., "Aggregated from NÉBIH reports")

If you cannot find specific structured data points or the query is more general, provide a concise textual summary of any relevant information you can infer or find related to the query.
Prioritize returning JSON if specific data points are found. Limit to a maximum of 5-7 most relevant JSON objects.
Respond in ${promptLang}. Your response MUST be either a valid JSON array as described, or a textual summary if JSON is not appropriate.
If returning JSON, ensure it is ONLY the JSON array, with no other text or markdown.`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const responseText = response.text;
      const parsedDataOrErrorString = parseGeminiJsonResponse(responseText);

      if (typeof parsedDataOrErrorString === 'string') {
        setError(parsedDataOrErrorString); 
        if (responseText.trim() !== "[]" && responseText.trim() !== "" && !responseText.trim().startsWith(t('adminAiReports_error_parsingFailed', {rawResponse: ''}).substring(0,10))) { // Avoid showing parser error as raw text
            setRawTextResult(responseText); 
        } else {
            setRawTextResult(null);
        }
        setResults([]);
      } else {
        setResults(parsedDataOrErrorString);
        setRawTextResult(null); 
        if (parsedDataOrErrorString.length === 0) {
             if (responseText.trim() !== "[]" && responseText.trim() !== "") {
                setRawTextResult(t('adminAiReports_emptyResultsWithRawText', { rawResponse: responseText.substring(0,150) }));
             }
        }
      }

    } catch (err) {
      console.error("Gemini API Search error:", err);
      setError(err instanceof Error ? err.message : t('adminAiReports_error_networkOrServer'));
      setRawTextResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-slate-900 min-h-screen">
      <PageTitle title={t('adminAiReports_vectorSearchTitle')} subtitle={t('adminAiReports_vectorSearchSubTitle')} />
      <Card className="bg-slate-800">
        <div className="space-y-4">
          <p className="text-slate-300">
            {t('adminAiReports_vectorSearchDescription')}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('adminAiReports_searchPlaceholder')}
              className="flex-grow"
              inputClassName="sm:text-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              aria-label={t('adminAiReports_searchPlaceholder')}
            />
            <Button
              onClick={handleSearch}
              disabled={loading || !ai}
              isLoading={loading}
              className="sm:w-auto w-full"
              leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
              aria-label={loading ? t('searching') : t('search')}
            >
              {loading ? t('searching') : t('search')}
            </Button>
          </div>
          {!ai && <p className="text-xs text-amber-400 mt-1">{t('customerNewDemand_error_aiUnavailable')}</p>}
        </div>
      </Card>

      {loading && !error && (
        <div className="flex justify-center mt-6">
          <LoadingSpinner text={t('adminAiReports_loadingResults')} />
        </div>
      )}

      {error && (
        <Card className="mt-6 bg-red-800/30 border border-red-700">
          <p className="text-red-400 font-semibold">{t('error_occured')}:</p>
          <p className="text-red-300">{error}</p>
        </Card>
      )}
      
      {rawTextResult && !loading && (results.length === 0 || error) && (
         <Card className="mt-6 bg-slate-800">
            <h3 className="text-lg font-semibold mb-2 text-cyan-300">{t('adminAiReports_aiRawResponseTitle' as TranslationKey)}</h3>
            <pre className="text-sm text-slate-200 whitespace-pre-wrap p-3 bg-slate-700/50 rounded max-h-96 overflow-y-auto custom-scrollbar">
              {rawTextResult}
            </pre>
         </Card>
      )}

      {results.length > 0 && !loading && !error && (
        <Card className="mt-6 bg-slate-800">
          <h3 className="text-lg font-semibold mb-4 text-cyan-300">{t('adminAiReports_resultsTitle')}</h3>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="border-b border-slate-700">
                <tr>
                  <th className="p-3 font-semibold text-slate-300">{t('date')}</th>
                  <th className="p-3 font-semibold text-slate-300">{t('adminAiReports_stumpagePriceHeader')}</th>
                  <th className="p-3 font-semibold text-slate-300">{t('adminAiReports_nofuHeader')}</th>
                  <th className="p-3 font-semibold text-slate-300">{t('relevance_score')}</th>
                  <th className="p-3 font-semibold text-slate-300">{t('adminAiReports_sourceInfoHeader' as TranslationKey)}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, index) => (
                  <tr key={index} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="p-3 text-slate-200">{item.date}</td>
                    <td className="p-3 text-slate-200">{item.stumpage_price}</td>
                    <td className="p-3 text-slate-200">{item.nofu}</td>
                    <td className="p-3 font-mono text-cyan-400">{item.score.toFixed(4)}</td>
                    <td className="p-3 text-slate-300 text-xs">{item.source_info || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      
      {results.length === 0 && !rawTextResult && !loading && !error && query && (
         <Card className="mt-6">
            <p className="text-slate-400 text-center py-4">{t('adminAiReports_noResultsFound' as TranslationKey)}</p>
         </Card>
      )}
    </div>
  );
};

export default AdminAiReportsPage;
