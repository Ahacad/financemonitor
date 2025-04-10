# Economic Indicators Monitoring System

A comprehensive system for tracking economic indicators using Cloudflare Workers and FRED API data. Built with TypeScript for type safety and better developer experience.

## Architecture

- **Backend**: Cloudflare Workers with Workers KV storage
- **Data Source**: Federal Reserve Economic Data (FRED) API
- **Frontend**: Planned implementation with TradingView Lightweight Charts, D3.js, and Plotly
- **Language**: TypeScript with strict type checking

## Features

- RESTful API for economic data
- Tiered caching system for optimal performance
- Scheduled data updates via Cron Triggers
- Data transformations (YoY changes, moving averages, etc.)
- Pre-configured dashboards for different economic perspectives
- Type-safe codebase with TypeScript interfaces

## API Endpoints

### Core Endpoints

- `GET /api/indicators` - List all available indicators
- `GET /api/indicators/:category` - List indicators by category
- `GET /api/data/:seriesId` - Get time series data for a specific indicator
- `GET /api/data/:seriesId/latest` - Get the latest data point for an indicator
- `GET /api/dashboard/:dashboardId` - Get pre-configured dashboard data

### Query Parameters

- `transformation` - Apply data transformation (pct_change_yoy, moving_avg, etc.)
- `start_date` - Filter data from this date (YYYY-MM-DD)
- `end_date` - Filter data until this date (YYYY-MM-DD)
- `frequency` - Change data frequency (D, W, M, Q, A)
- `units` - Change data units
- `limit` - Limit number of observations returned

## Economic Indicators

### Growth Indicators
- Real GDP (GDPC1)
- Industrial Production (INDPRO)
- Retail Sales (RSXFS)
- Personal Consumption (PCE)

### Inflation Metrics
- Consumer Price Index (CPIAUCSL)
- Core CPI (CPILFESL)
- PCE Price Index (PCEPI)
- Core PCE Price Index (PCEPILFE)
- Producer Price Index (PPIACO)

### Labor Market
- Unemployment Rate (UNRATE)
- Nonfarm Payrolls (PAYEMS)
- Initial Jobless Claims (ICSA)
- Labor Force Participation (CIVPART)
- Job Openings (JTSJOL)

### Leading Indicators
- 10Y-2Y Treasury Spread (T10Y2Y)
- Building Permits (PERMIT)
- Consumer Sentiment (UMCSENT)
- ISM Manufacturing PMI (NAPM)

### Financial Conditions
- Federal Funds Rate (FEDFUNDS)
- 10-Year Treasury Yield (GS10)
- Corporate Bond Spreads (BAA10Y)
- Money Supply M2 (M2SL)

### Housing Market
- House Price Index (CSUSHPISA)
- Housing Starts (HOUST)
- Mortgage Rates (MORTGAGE30US)

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/financemonitor.git
   cd financemonitor
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure your FRED API key:
   ```
   wrangler secret put FRED_API_KEY
   ```

4. Create a KV namespace:
   ```
   wrangler kv:namespace create ECONOMIC_DATA
   ```

5. Update `wrangler.toml` with your account ID and KV namespace ID.

6. Build the TypeScript code:
   ```
   npm run build
   ```

7. Run the development server:
   ```
   npm run dev
   ```

8. Deploy to Cloudflare Workers:
   ```
   npm run publish
   ```

## Development

### TypeScript Structure

The codebase is organized into the following structure:

- `src/types/` - TypeScript interfaces and type definitions
- `src/api/` - API endpoints and request handlers
- `src/services/` - Service layer with FRED API integration
- `src/utils/` - Utility functions for caching, CORS, and data processing

### Type Safety

The project uses TypeScript's strict mode to ensure:
- Null safety with strict null checks
- Proper typing for all API parameters and responses
- Type guards and narrowing for robust error handling

## Frontend Development

The frontend implementation is planned with:
- TradingView Lightweight Charts for time-series visualization
- D3.js for custom visualizations
- Plotly for statistical visualizations

## License

MIT
