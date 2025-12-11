import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomePage } from './pages/HomePage';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { PlanningPage } from './pages/PlanningPage';
import { BrowsePage } from './pages/BrowsePage';
import { CityViewPage } from './pages/CityViewPage';
import { CountryViewPage } from './pages/CountryViewPage';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <Navigation />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/discover" element={<DiscoveryPage />} />
            <Route path="/plan" element={<PlanningPage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/city/:cityId" element={<CityViewPage />} />
            <Route path="/country/:countryId" element={<CountryViewPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
