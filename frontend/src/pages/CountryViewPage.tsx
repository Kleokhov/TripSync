import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Globe, ArrowLeft, Loader2, MapPin, Thermometer, Utensils } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { getCountryById, type CountryDetails } from '../services/api';

export function CountryViewPage() {
  const { countryId } = useParams<{ countryId: string }>();
  const navigate = useNavigate();
  const [country, setCountry] = useState<CountryDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCountry = async () => {
      if (!countryId) return;
      setLoading(true);
      try {
        const data = await getCountryById(parseInt(countryId));
        // Convert numeric fields from strings to numbers
        // Treat 0 as null for GDP (0 means no data)
        const validatedData = {
          ...data,
          gdp: data.gdp != null && Number(data.gdp) !== 0 ? Number(data.gdp) : null,
          avgHeatIndex: data.avgHeatIndex != null ? Number(data.avgHeatIndex) : null,
          avgCityTemperature: data.avgCityTemperature != null ? Number(data.avgCityTemperature) : null,
          avgFoodPrice: data.avgFoodPrice != null ? Number(data.avgFoodPrice) : null,
          avgGasPrice: data.avgGasPrice != null ? Number(data.avgGasPrice) : null,
          avgMonthlySalary: data.avgMonthlySalary != null ? Number(data.avgMonthlySalary) : null,
          cityCount: Number(data.cityCount) || 0,
        };
        setCountry(validatedData);
      } catch (error) {
        console.error('Error loading country:', error);
        alert('Country not found');
        navigate('/browse');
      } finally {
        setLoading(false);
      }
    };
    loadCountry();
  }, [countryId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!country) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>

        <Card className="bg-white/80 backdrop-blur shadow-xl border-indigo-100 mb-6">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Globe className="size-8 text-indigo-600" />
              {country.name}
            </CardTitle>
            <CardDescription>
              {country.alpha2Code && country.alpha3Code && (
                <span>
                  {country.alpha2Code} / {country.alpha3Code}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {country.avgCityTemperature !== null && country.avgCityTemperature !== undefined && (
                <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
                  <Thermometer className="size-6 text-orange-600" />
                  <div>
                    <p className="text-xs text-gray-600">Avg City Temperature</p>
                    <p className="text-xl font-semibold">
                      {Number(country.avgCityTemperature).toFixed(1)}°C
                    </p>
                  </div>
                </div>
              )}
              {country.avgFoodPrice !== null && country.avgFoodPrice !== undefined && (
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <Utensils className="size-6 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-600">Avg Food Price</p>
                    <p className="text-xl font-semibold">
                      ${Number(country.avgFoodPrice).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <MapPin className="size-6 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600">Cities</p>
                  <p className="text-xl font-semibold">{country.cityCount}</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">GDP</p>
                <p className="text-lg">
                  {country.gdp != null && country.gdp !== undefined && Number(country.gdp) > 0
                    ? (() => {
                        const gdpValue = Number(country.gdp);
                        // GDP is stored in millions, convert to trillions: divide by 1,000,000
                        const inTrillions = gdpValue / 1e6;
                        return `$${inTrillions.toFixed(2)} Trillion`;
                      })()
                    : 'N/A'}
                </p>
              </div>
              {country.avgHeatIndex !== null && country.avgHeatIndex !== undefined && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Average Heat Index</p>
                  <p className="text-lg">
                    {Number(country.avgHeatIndex).toFixed(1)}
                  </p>
                </div>
              )}
              {country.avgGasPrice !== null && country.avgGasPrice !== undefined && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Average Gas Price</p>
                  <p className="text-lg">
                    ${Number(country.avgGasPrice).toFixed(2)}
                  </p>
                </div>
              )}
              {country.avgMonthlySalary !== null && country.avgMonthlySalary !== undefined && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Average Monthly Salary</p>
                  <p className="text-lg">
                    ${Number(country.avgMonthlySalary).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {country.otherName && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Also known as: {country.otherName}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {country.exampleCities && country.exampleCities.length > 0 && (
          <Card className="bg-white/80 backdrop-blur shadow-xl border-indigo-100">
            <CardHeader>
              <CardTitle>Example Cities</CardTitle>
              <CardDescription>Some cities in this country</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {country.exampleCities.map((city) => (
                  <Link
                    key={city.cityId}
                    to={`/city/${city.cityId}`}
                    className="block p-4 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-indigo-600" />
                      <span className="font-medium">{city.cityName}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

