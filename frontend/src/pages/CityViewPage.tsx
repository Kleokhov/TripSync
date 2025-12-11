import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, ArrowLeft, Loader2, Thermometer, Utensils, Hotel, MapPinned, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { getCityById, getCityPois, getCityHotels, type CityDetails, type POI, type Hotel } from '../services/api';

export function CityViewPage() {
  const { cityId } = useParams<{ cityId: string }>();
  const navigate = useNavigate();
  const [city, setCity] = useState<CityDetails | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState({ city: true, pois: false, hotels: false });
  const [activeTab, setActiveTab] = useState<'overview' | 'attractions' | 'hotels'>('overview');

  useEffect(() => {
    const loadCity = async () => {
      if (!cityId) return;
      setLoading(prev => ({ ...prev, city: true }));
      try {
        const data = await getCityById(parseInt(cityId));
        // Convert numeric fields from strings to numbers
        const validatedData = {
          ...data,
          latitude: data.latitude != null ? Number(data.latitude) : null,
          longitude: data.longitude != null ? Number(data.longitude) : null,
          avgTemperature: data.avgTemperature != null ? Number(data.avgTemperature) : null,
          avgFoodPrice: data.avgFoodPrice != null ? Number(data.avgFoodPrice) : null,
          avgGasPrice: data.avgGasPrice != null ? Number(data.avgGasPrice) : null,
          avgMonthlySalary: data.avgMonthlySalary != null ? Number(data.avgMonthlySalary) : null,
          avgHotelRating: data.avgHotelRating != null ? Number(data.avgHotelRating) : null,
          poiCount: Number(data.poiCount) || 0,
          hotelCount: Number(data.hotelCount) || 0,
        };
        setCity(validatedData);
      } catch (error) {
        console.error('Error loading city:', error);
        const errorMessage = error instanceof Error ? error.message : 'City not found';
        alert(`Error: ${errorMessage}\n\nThe city may not exist in the database or may have been removed.`);
        navigate('/browse');
      } finally {
        setLoading(prev => ({ ...prev, city: false }));
      }
    };
    loadCity();
  }, [cityId, navigate]);

  const loadPois = async () => {
    if (!cityId || activeTab !== 'attractions') return;
    setLoading(prev => ({ ...prev, pois: true }));
    try {
      const response = await getCityPois(parseInt(cityId), { limit: 100 });
      // Convert numeric fields from strings to numbers
      const validatedPois = response.pois.map(poi => ({
        ...poi,
        latitude: poi.latitude != null ? Number(poi.latitude) : null,
        longitude: poi.longitude != null ? Number(poi.longitude) : null,
      }));
      setPois(validatedPois);
    } catch (error) {
      console.error('Error loading POIs:', error);
    } finally {
      setLoading(prev => ({ ...prev, pois: false }));
    }
  };

  const loadHotels = async () => {
    if (!cityId || activeTab !== 'hotels') return;
    setLoading(prev => ({ ...prev, hotels: true }));
    try {
      const response = await getCityHotels(parseInt(cityId), { limit: 100 });
      // Convert numeric fields from strings to numbers
      const validatedHotels = response.hotels.map(hotel => ({
        ...hotel,
        rating: hotel.rating != null ? Number(hotel.rating) : null,
      }));
      setHotels(validatedHotels);
    } catch (error) {
      console.error('Error loading hotels:', error);
    } finally {
      setLoading(prev => ({ ...prev, hotels: false }));
    }
  };

  useEffect(() => {
    if (activeTab === 'attractions') {
      loadPois();
    } else if (activeTab === 'hotels') {
      loadHotels();
    }
  }, [activeTab, cityId]);

  if (loading.city) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!city) {
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
            <CardTitle className="text-3xl">{city.name}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <MapPin className="size-4" />
              <Link to={`/country/${city.countryId}`} className="hover:text-indigo-600">
                {city.countryName || `Country ID: ${city.countryId}`}
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {city.avgTemperature !== null && city.avgTemperature !== undefined && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                  <Thermometer className="size-5 text-orange-600" />
                  <div>
                    <p className="text-xs text-gray-600">Temperature</p>
                    <p className="font-semibold">
                      {Number(city.avgTemperature).toFixed(1)}°C
                    </p>
                  </div>
                </div>
              )}
              {city.avgFoodPrice !== null && city.avgFoodPrice !== undefined && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <Utensils className="size-5 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-600">Avg Food Price</p>
                    <p className="font-semibold">
                      ${Number(city.avgFoodPrice).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <MapPinned className="size-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600">Attractions</p>
                  <p className="font-semibold">{city.poiCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                <Hotel className="size-5 text-purple-600" />
                <div>
                  <p className="text-xs text-gray-600">Hotels</p>
                  <p className="font-semibold">
                    {city.hotelCount}
                    {city.avgHotelRating !== null && city.avgHotelRating !== undefined && (
                      <span className="text-xs ml-1">
                        ({Number(city.avgHotelRating).toFixed(1)}★)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {city.latitude !== null && city.longitude !== null && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Coordinates: {Number(city.latitude).toFixed(4)}, {Number(city.longitude).toFixed(4)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4 mb-6">
          <Button
            onClick={() => navigate('/plan', { state: { cityIds: [city.cityId] } })}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Calendar className="size-4 mr-2" />
            Plan Trip Here
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attractions">Attractions ({city.poiCount})</TabsTrigger>
            <TabsTrigger value="hotels">Hotels ({city.hotelCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {city.avgGasPrice !== null && city.avgGasPrice !== undefined && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Average Gas Price</p>
                      <p className="text-lg">
                        ${Number(city.avgGasPrice).toFixed(2)}
                      </p>
                    </div>
                  )}
                  {city.avgMonthlySalary !== null && city.avgMonthlySalary !== undefined && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Average Monthly Salary</p>
                      <p className="text-lg">
                        ${Number(city.avgMonthlySalary).toFixed(2)}
                      </p>
                    </div>
                  )}
                  {city.latestTempYear && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Latest Temperature Year</p>
                      <p className="text-lg">{city.latestTempYear}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attractions" className="mt-6">
            {loading.pois ? (
              <div className="text-center py-12">
                <Loader2 className="size-8 animate-spin mx-auto text-indigo-600 mb-4" />
                <p className="text-gray-600">Loading attractions...</p>
              </div>
            ) : pois.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {pois.map((poi) => (
                  <Card key={poi.poiId}>
                    <CardHeader>
                      <CardTitle className="text-lg">{poi.name}</CardTitle>
                      <CardDescription>
                        <Badge variant="outline">{poi.primaryCategory}</Badge>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {poi.latitude !== null && poi.longitude !== null && (
                        <p className="text-xs text-gray-500">
                          {Number(poi.latitude).toFixed(4)}, {Number(poi.longitude).toFixed(4)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No attractions found
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="hotels" className="mt-6">
            {loading.hotels ? (
              <div className="text-center py-12">
                <Loader2 className="size-8 animate-spin mx-auto text-indigo-600 mb-4" />
                <p className="text-gray-600">Loading hotels...</p>
              </div>
            ) : hotels.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {hotels.map((hotel) => (
                  <Card key={hotel.hotelId}>
                    <CardHeader>
                      <CardTitle className="text-lg">{hotel.name}</CardTitle>
                      {hotel.rating !== null && hotel.rating !== undefined && (
                        <CardDescription>
                          <Badge className="bg-yellow-500">
                            {Number(hotel.rating).toFixed(1)}★
                          </Badge>
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {hotel.address && <p className="text-sm text-gray-600">{hotel.address}</p>}
                      {hotel.description && <p className="text-sm text-gray-500 mt-2">{hotel.description}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No hotels found
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

