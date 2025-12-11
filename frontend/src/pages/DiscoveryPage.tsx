import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GroupPreferencesForm } from '../components/GroupPreferencesForm';
import { DestinationResults } from '../components/DestinationResults';
import { 
  getAvailableCities, 
  getDestinationsByFeatures,
  type DestinationMatch 
} from '../services/api';

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

export function DiscoveryPage() {
  const navigate = useNavigate();
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
    setResults(null); // Clear previous results
    
    try {
      let candidateCityIds: number[] | undefined = undefined;

      // Step 1: If availability check is enabled, get reachable cities first
      if (groupFilters.checkAvailability) {
        const originCityIds = memberPreferences
          .map(m => m.originCityId)
          .filter((id): id is number => id !== null);

        if (originCityIds.length > 0) {
          const availabilityResponse = await getAvailableCities({
            originCityIds,
            requireAllReach: false,
            maxStop: groupFilters.maxStops,
            limit: 100,
          });

          candidateCityIds = availabilityResponse.destinations.map(d => d.cityId);
          
          if (candidateCityIds.length === 0) {
            alert('No destinations found that are reachable from the selected origin cities. Please try different origins or increase max stops.');
            setIsLoading(false);
            return;
          }
        }
      }

      // Step 2: Get destinations by features
      const featuresResponse = await getDestinationsByFeatures({
        scope: 'city',
        candidateCityIds,
        minTemp: groupFilters.minTemp ?? undefined,
        maxTemp: groupFilters.maxTemp ?? undefined,
        maxAvgFoodPrice: groupFilters.maxAvgFoodPrice ?? undefined,
        minHotelRating: groupFilters.minHotelRating ?? undefined,
        minHotelCount: groupFilters.minHotelCount ?? undefined,
        minPoiCount: groupFilters.minPoiCount ?? undefined,
        preferredCategories: groupFilters.preferredCategories.length > 0 
          ? groupFilters.preferredCategories 
          : undefined,
        limit: 5,
      });

      if (featuresResponse.destinations.length === 0) {
        alert('No destinations found matching your criteria. Please try adjusting your filters.');
        setIsLoading(false);
        return;
      }

      if (!featuresResponse || !featuresResponse.destinations) {
        throw new Error('Invalid response from server');
      }

      // Ensure all destinations have required properties and convert to numbers
      const validatedDestinations = featuresResponse.destinations.map(dest => ({
        ...dest,
        avgTemperature: dest.avgTemperature != null ? Number(dest.avgTemperature) : null,
        avgFoodPrice: dest.avgFoodPrice != null ? Number(dest.avgFoodPrice) : null,
        avgHotelRating: dest.avgHotelRating != null ? Number(dest.avgHotelRating) : null,
        hotelCount: Number(dest.hotelCount) || 0,
        poiCount: Number(dest.poiCount) || 0,
        matchingPoiCount: Number(dest.matchingPoiCount) || 0,
        foodScore: Number(dest.foodScore) || 0,
        attractionsScore: Number(dest.attractionsScore) || 0,
        hotelScore: Number(dest.hotelScore) || 0,
        compositeScore: Number(dest.compositeScore) || 0,
      }));

      setResults(validatedDestinations);
    } catch (error) {
      console.error('Error fetching destinations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch destinations';
      
      // Show user-friendly error
      alert(`Error: ${errorMessage}\n\nPlease check:\n- Backend server is running on port 3001\n- Database connection is working\n- Try more specific filters (e.g., narrower temperature range)\n\nCheck browser console for details.`);
      
      // Reset to form view on error
      setResults(null);
    } finally {
      setIsLoading(false);
    }
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

  const handlePlanTrip = (cityIds: number[]) => {
    // Navigate to planning page with selected cities
    navigate('/plan', { state: { cityIds } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {isLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 shadow-xl max-w-md w-full mx-4">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Finding Destinations</h3>
                <p className="text-sm text-gray-600">
                  This may take 10-15 seconds for broad filters...
                </p>
              </div>
            </div>
          </div>
        )}
        {!results && !isLoading ? (
          <GroupPreferencesForm 
            members={members}
            setMembers={setMembers}
            filters={filters}
            setFilters={setFilters}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        ) : results && !isLoading ? (
          <DestinationResults 
            results={results}
            onReset={handleReset}
            onPlanTrip={handlePlanTrip}
          />
        ) : null}
      </div>
    </div>
  );
}

