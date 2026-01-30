/**
 * FMP (FINANCIAL MODELING PREP) MODULE
 * Fetches market data for descriptive context only
 * 
 * BASE URL: https://financialmodelingprep.com/api/v3/
 * DOCS: https://site.financialmodelingprep.com/developer/docs/
 * 
 * CONSTRAINTS:
 * - Descriptive only, never prescriptive
 * - No trading signals or timing implications
 * - Must accept env parameter for secrets
 * - Must wrap ALL fetch in try/catch
 */

// Official FMP API base URL
const BASE_URL = 'https://financialmodelingprep.com/api/v3/';

// Market indices to track
const INDICES = {
  SP500: '^GSPC',
  NASDAQ: '^IXIC',
  DOW: '^DJI',
  VIX: '^VIX',
  US10Y: '^TNX'
};

/**
 * Fetch market context data
 * @param {Object} env - Cloudflare environment with secrets
 * @returns {Object|null} Structured market data or null
 */
export async function fetchMarketData(env) {
  try {
    const apiKey = env.FMP_API_KEY;
    if (!apiKey) {
      console.warn('FMP_API_KEY not configured');
      return null;
    }
    
    // Fetch quotes for major indices
    const quotes = await fetchIndexQuotes(apiKey);
    if (!quotes) return null;
    
    // Fetch market news (macro-focused)
    const marketNews = await fetchMarketNews(apiKey);
    
    return {
      indices: quotes,
      news: marketNews,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('FMP fetch failed:', error.message);
    return null;
  }
}

/**
 * Fetch index quotes
 */
async function fetchIndexQuotes(apiKey) {
  try {
    const symbols = Object.values(INDICES).join(',');
    const response = await fetch(
      `${BASE_URL}quote/${symbols}?apikey=${apiKey}`
    );
    
    if (!response.ok) {
      console.warn(`FMP quote API returned ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    
    // Map to structured format
    const quotes = {};
    data.forEach(quote => {
      const symbol = quote.symbol;
      const key = getKeyByValue(INDICES, symbol);
      
      if (key) {
        quotes[key] = {
          symbol: symbol,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changesPercentage,
          dayLow: quote.dayLow,
          dayHigh: quote.dayHigh,
          volume: quote.volume,
          timestamp: new Date(quote.timestamp).toISOString()
        };
      }
    });
    
    return quotes;
    
  } catch (error) {
    console.warn('FMP index quotes fetch failed:', error.message);
    return null;
  }
}

/**
 * Fetch market news (macro-focused)
 */
async function fetchMarketNews(apiKey) {
  try {
    const response = await fetch(
      `${BASE_URL}stock_news?limit=10&apikey=${apiKey}`
    );
    
    if (!response.ok) {
      console.warn(`FMP news API returned ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    
    // Filter and structure news
    return data.slice(0, 5).map(article => ({
      title: article.title,
      site: article.site,
      publishedAt: article.publishedDate,
      url: article.url,
      summary: article.text ? article.text.substring(0, 200) + '...' : ''
    }));
    
  } catch (error) {
    console.warn('FMP market news fetch failed:', error.message);
    return null;
  }
}

/**
 * Helper: get object key by value
 */
function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
            }
