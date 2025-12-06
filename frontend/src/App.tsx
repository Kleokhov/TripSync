import { useState } from 'react';
import { GroupPreferencesForm } from './components/GroupPreferencesForm';
import { DestinationResults } from './components/DestinationResults';
import { MapPin } from 'lucide-react';

export interface MemberPreference {
  id: string;
  name: string;
  originCityId: number | null;
  originCityName: string;
}

export interface GroupFilters {
  minTemp: number | null;
  maxTemp: number | null;
  maxAvgFoodPrice: number | null;
  minHotelRating: number | null;
  minHotelCount: number | null;
  minPoiCount: number | null;
  preferredCategories: string[];
  maxStops: number;
  checkAvailability: boolean;
}

export interface DestinationMatch {
  id: number;
  scope: string;
  name: string;
  countryId: number;
  countryName: string;
  avgTemperature: number | null;
  avgFoodPrice: number | null;
  avgHotelRating: number | null;
  hotelCount: number;
  poiCount: number;
  compositeScore: number;
  foodScore: number;
  attractionsScore: number;
  hotelScore: number;
  sampleAttractions: Array<{
    poiId: number;
    name: string;
    category: string;
    cityId: number | null;
  }>;
}

function App() {
  const [members, setMembers] = useState<MemberPreference[]>([
    { id: '1', name: '', originCityId: null, originCityName: '' }
  ]);
  const [filters, setFilters] = useState<GroupFilters>({
    minTemp: null,
    maxTemp: null,
    maxAvgFoodPrice: null,
    minHotelRating: null,
    minHotelCount: null,
    minPoiCount: null,
    preferredCategories: [],
    maxStops: 1,
    checkAvailability: false
  });
  const [results, setResults] = useState<DestinationMatch[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (
    memberPreferences: MemberPreference[], 
    groupFilters: GroupFilters
  ) => {
    setIsLoading(true);
    
    // TODO: Replace with actual API calls
    // 1. If checkAvailability, call POST /destinations/availability/cities
    // 2. Call POST /destinations/features with filters and optional candidateCityIds
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const recommendations = calculateDestinations(memberPreferences, groupFilters);
    setResults(recommendations);
    setIsLoading(false);
  };

  const handleReset = () => {
    setResults(null);
    setMembers([{ id: '1', name: '', originCityId: null, originCityName: '' }]);
    setFilters({
      minTemp: null,
      maxTemp: null,
      maxAvgFoodPrice: null,
      minHotelRating: null,
      minHotelCount: null,
      minPoiCount: null,
      preferredCategories: [],
      maxStops: 1,
      checkAvailability: false
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <MapPin className="size-10 text-indigo-600" />
            <h1 className="text-5xl text-indigo-900">TripSync</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Find the perfect vacation destination for your entire friend group. 
            Input starting locations and preferences to discover cities that match your collective interests.
          </p>
        </div>

        {/* Main Content */}
        {!results ? (
          <GroupPreferencesForm 
            members={members}
            setMembers={setMembers}
            filters={filters}
            setFilters={setFilters}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        ) : (
          <DestinationResults 
            results={results}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}

// Mock destination matching algorithm
function calculateDestinations(
  members: MemberPreference[], 
  filters: GroupFilters
): DestinationMatch[] {
  // Mock city database matching the API response structure
  const cities = [
    {
      id: 1,
      scope: 'city',
      name: 'Barcelona',
      countryId: 34,
      countryName: 'Spain',
      avgTemperature: 19.2,
      avgFoodPrice: 12.5,
      avgHotelRating: 4.2,
      hotelCount: 120,
      poiCount: 210,
      categories: ['Museum', 'Beach', 'Architecture', 'Park'],
      sampleAttractions: [
        { poiId: 1, name: 'La Sagrada Família', category: 'Architecture', cityId: 1 },
        { poiId: 2, name: 'Park Güell', category: 'Park', cityId: 1 },
        { poiId: 3, name: 'Gothic Quarter', category: 'Historic', cityId: 1 }
      ]
    },
    {
      id: 2,
      scope: 'city',
      name: 'Tokyo',
      countryId: 392,
      countryName: 'Japan',
      avgTemperature: 16.5,
      avgFoodPrice: 10.8,
      avgHotelRating: 4.5,
      hotelCount: 250,
      poiCount: 340,
      categories: ['Museum', 'Temple', 'Shopping', 'Park'],
      sampleAttractions: [
        { poiId: 4, name: 'Senso-ji Temple', category: 'Temple', cityId: 2 },
        { poiId: 5, name: 'Tokyo Skytree', category: 'Viewpoint', cityId: 2 },
        { poiId: 6, name: 'Meiji Shrine', category: 'Temple', cityId: 2 }
      ]
    },
    {
      id: 3,
      scope: 'city',
      name: 'Lisbon',
      countryId: 620,
      countryName: 'Portugal',
      avgTemperature: 18.7,
      avgFoodPrice: 10.2,
      avgHotelRating: 3.9,
      hotelCount: 95,
      poiCount: 145,
      categories: ['Historic', 'Beach', 'Viewpoint', 'Museum'],
      sampleAttractions: [
        { poiId: 7, name: 'Belém Tower', category: 'Historic', cityId: 3 },
        { poiId: 8, name: 'Jerónimos Monastery', category: 'Historic', cityId: 3 },
        { poiId: 9, name: 'São Jorge Castle', category: 'Castle', cityId: 3 }
      ]
    },
    {
      id: 4,
      scope: 'city',
      name: 'Amsterdam',
      countryId: 528,
      countryName: 'Netherlands',
      avgTemperature: 11.2,
      avgFoodPrice: 15.3,
      avgHotelRating: 4.1,
      hotelCount: 180,
      poiCount: 195,
      categories: ['Museum', 'Park', 'Historic', 'Canal'],
      sampleAttractions: [
        { poiId: 10, name: 'Van Gogh Museum', category: 'Museum', cityId: 4 },
        { poiId: 11, name: 'Anne Frank House', category: 'Museum', cityId: 4 },
        { poiId: 12, name: 'Rijksmuseum', category: 'Museum', cityId: 4 }
      ]
    },
    {
      id: 5,
      scope: 'city',
      name: 'Bangkok',
      countryId: 764,
      countryName: 'Thailand',
      avgTemperature: 28.6,
      avgFoodPrice: 5.5,
      avgHotelRating: 4.3,
      hotelCount: 310,
      poiCount: 280,
      categories: ['Temple', 'Market', 'Palace', 'Shopping'],
      sampleAttractions: [
        { poiId: 13, name: 'Grand Palace', category: 'Palace', cityId: 5 },
        { poiId: 14, name: 'Wat Pho', category: 'Temple', cityId: 5 },
        { poiId: 15, name: 'Floating Market', category: 'Market', cityId: 5 }
      ]
    },
    {
      id: 6,
      scope: 'city',
      name: 'Prague',
      countryId: 203,
      countryName: 'Czech Republic',
      avgTemperature: 10.4,
      avgFoodPrice: 8.9,
      avgHotelRating: 4.0,
      hotelCount: 145,
      poiCount: 175,
      categories: ['Castle', 'Historic', 'Bridge', 'Museum'],
      sampleAttractions: [
        { poiId: 16, name: 'Prague Castle', category: 'Castle', cityId: 6 },
        { poiId: 17, name: 'Charles Bridge', category: 'Bridge', cityId: 6 },
        { poiId: 18, name: 'Old Town Square', category: 'Historic', cityId: 6 }
      ]
    },
    {
      id: 7,
      scope: 'city',
      name: 'Cape Town',
      countryId: 710,
      countryName: 'South Africa',
      avgTemperature: 17.3,
      avgFoodPrice: 9.7,
      avgHotelRating: 4.2,
      hotelCount: 135,
      poiCount: 160,
      categories: ['Nature', 'Beach', 'Mountain', 'Viewpoint'],
      sampleAttractions: [
        { poiId: 19, name: 'Table Mountain', category: 'Mountain', cityId: 7 },
        { poiId: 20, name: 'Cape of Good Hope', category: 'Nature', cityId: 7 },
        { poiId: 21, name: 'V&A Waterfront', category: 'Shopping', cityId: 7 }
      ]
    }
  ];

  // Apply filters
  let filteredCities = cities.filter(city => {
    // Temperature filter
    if (filters.minTemp !== null && city.avgTemperature !== null && city.avgTemperature < filters.minTemp) {
      return false;
    }
    if (filters.maxTemp !== null && city.avgTemperature !== null && city.avgTemperature > filters.maxTemp) {
      return false;
    }
    
    // Food price filter
    if (filters.maxAvgFoodPrice !== null && city.avgFoodPrice !== null && city.avgFoodPrice > filters.maxAvgFoodPrice) {
      return false;
    }
    
    // Hotel filters
    if (filters.minHotelRating !== null && city.avgHotelRating !== null && city.avgHotelRating < filters.minHotelRating) {
      return false;
    }
    if (filters.minHotelCount !== null && city.hotelCount < filters.minHotelCount) {
      return false;
    }
    
    // POI filter
    if (filters.minPoiCount !== null && city.poiCount < filters.minPoiCount) {
      return false;
    }
    
    return true;
  });

  // Calculate scores for each city
  const scoredCities = filteredCities.map(city => {
    // Food score (inverse of price, normalized)
    const foodScore = city.avgFoodPrice ? Math.max(0, 1 - (city.avgFoodPrice / 20)) : 0.5;
    
    // Hotel score (combination of rating and count)
    const ratingScore = city.avgHotelRating ? city.avgHotelRating / 5 : 0.5;
    const countScore = Math.min(city.hotelCount / 200, 1);
    const hotelScore = (ratingScore * 0.7 + countScore * 0.3);
    
    // Attractions score (POI count + category match)
    let attractionsScore = Math.min(city.poiCount / 300, 0.7);
    if (filters.preferredCategories.length > 0) {
      const matchingCategories = city.categories.filter(cat => 
        filters.preferredCategories.includes(cat)
      ).length;
      const categoryBonus = (matchingCategories / filters.preferredCategories.length) * 0.3;
      attractionsScore += categoryBonus;
    } else {
      attractionsScore += 0.3;
    }
    
    // Composite score with default weights
    const compositeScore = (foodScore * 0.33 + attractionsScore * 0.33 + hotelScore * 0.34);

    return {
      ...city,
      compositeScore: compositeScore * 100,
      foodScore: foodScore * 100,
      attractionsScore: attractionsScore * 100,
      hotelScore: hotelScore * 100
    };
  });

  // Sort by composite score and return top 5
  return scoredCities
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 5);
}

export default App;