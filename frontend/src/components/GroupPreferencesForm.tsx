import { Plus, Trash2, Send, Users, SlidersHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { MemberPreference, GroupFilters } from '../pages/DiscoveryPage';
import { Badge } from './ui/badge';

interface GroupPreferencesFormProps {
  members: MemberPreference[];
  setMembers: (members: MemberPreference[]) => void;
  filters: GroupFilters;
  setFilters: (filters: GroupFilters) => void;
  onSubmit: (members: MemberPreference[], filters: GroupFilters) => void;
  isLoading: boolean;
}

const POI_CATEGORIES = [
  'Museum', 'Beach', 'Park', 'Temple', 'Castle', 'Historic', 
  'Nature', 'Mountain', 'Viewpoint', 'Shopping', 'Market', 
  'Architecture', 'Palace', 'Bridge', 'Church'
];

// Mock cities for origin selection - in production, this would come from GET /cities
const MOCK_CITIES = [
  { id: 1, name: 'New York', country: 'USA' },
  { id: 2, name: 'Los Angeles', country: 'USA' },
  { id: 3, name: 'London', country: 'UK' },
  { id: 4, name: 'Paris', country: 'France' },
  { id: 5, name: 'Berlin', country: 'Germany' },
  { id: 6, name: 'Rome', country: 'Italy' },
  { id: 7, name: 'Madrid', country: 'Spain' },
  { id: 8, name: 'Tokyo', country: 'Japan' },
  { id: 9, name: 'Sydney', country: 'Australia' },
  { id: 10, name: 'Toronto', country: 'Canada' }
];

export function GroupPreferencesForm({ 
  members, 
  setMembers, 
  filters,
  setFilters,
  onSubmit, 
  isLoading 
}: GroupPreferencesFormProps) {
  const addMember = () => {
    if (members.length < 6) {
      const newMember: MemberPreference = {
        id: Date.now().toString(),
        name: '',
        originCityId: null,
        originCityName: ''
      };
      setMembers([...members, newMember]);
    }
  };

  const removeMember = (id: string) => {
    if (members.length > 1) {
      setMembers(members.filter(m => m.id !== id));
    }
  };

  const updateMember = (id: string, field: keyof MemberPreference, value: string | number | null) => {
    setMembers(
      members.map(m => 
        m.id === id ? { ...m, [field]: value } : m
      )
    );
  };

  const selectCity = (memberId: string, cityId: number) => {
    const city = MOCK_CITIES.find(c => c.id === cityId);
    if (city) {
      setMembers(
        members.map(m => 
          m.id === memberId 
            ? { ...m, originCityId: city.id, originCityName: `${city.name}, ${city.country}` }
            : m
        )
      );
    }
  };

  const toggleCategory = (category: string) => {
    if (filters.preferredCategories.includes(category)) {
      setFilters({
        ...filters,
        preferredCategories: filters.preferredCategories.filter(c => c !== category)
      });
    } else {
      setFilters({
        ...filters,
        preferredCategories: [...filters.preferredCategories, category]
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const hasValidMember = members.some(m => m.name.trim());
    
    if (!hasValidMember) {
      alert('Please add at least one member with a name');
      return;
    }

    onSubmit(members, filters);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Group Members Section */}
      <Card className="bg-white/80 backdrop-blur shadow-xl border-indigo-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5 text-indigo-600" />
            Group Members
          </CardTitle>
          <CardDescription>
            Add up to 6 members and their starting locations (optional for availability check)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {members.map((member, index) => (
            <div key={member.id}>
              {index > 0 && <Separator className="mb-6" />}
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-indigo-900">
                    Member {index + 1}
                  </h3>
                  {members.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember(member.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="size-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`name-${member.id}`}>Name</Label>
                    <Input
                      id={`name-${member.id}`}
                      placeholder="Enter name"
                      value={member.name}
                      onChange={(e) => updateMember(member.id, 'name', e.target.value)}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`origin-${member.id}`}>Origin City (Optional)</Label>
                    <select
                      id={`origin-${member.id}`}
                      value={member.originCityId || ''}
                      onChange={(e) => selectCity(member.id, parseInt(e.target.value))}
                      className="w-full h-10 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select city</option>
                      {MOCK_CITIES.map(city => (
                        <option key={city.id} value={city.id}>
                          {city.name}, {city.country}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addMember}
            disabled={members.length >= 6}
            className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <Plus className="size-4 mr-2" />
            Add Member {members.length < 6 && `(${members.length}/6)`}
          </Button>
        </CardContent>
      </Card>

      {/* Group Preferences Section */}
      <Card className="bg-white/80 backdrop-blur shadow-xl border-indigo-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-5 text-indigo-600" />
            Destination Preferences
          </CardTitle>
          <CardDescription>
            Set group-wide preferences for temperature, budget, hotels, and attractions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Availability Check */}
          <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Checkbox
              id="checkAvailability"
              checked={filters.checkAvailability}
              onCheckedChange={(checked) => 
                setFilters({ ...filters, checkAvailability: checked as boolean })
              }
            />
            <div className="space-y-1">
              <Label htmlFor="checkAvailability" className="cursor-pointer">
                Check flight availability from origin cities
              </Label>
              <p className="text-sm text-gray-600">
                Only show destinations reachable from the group's starting locations
              </p>
            </div>
          </div>

          {filters.checkAvailability && (
            <div className="space-y-2">
              <Label htmlFor="maxStops">Maximum Flight Stops</Label>
              <Input
                id="maxStops"
                type="number"
                min="0"
                max="3"
                value={filters.maxStops}
                onChange={(e) => setFilters({ ...filters, maxStops: parseInt(e.target.value) || 0 })}
                className="bg-white"
              />
              <p className="text-sm text-gray-500">0 = direct flights only, 1 = up to 1 stop, etc.</p>
            </div>
          )}

          <Separator />

          {/* Temperature Range */}
          <div className="space-y-4">
            <h4 className="text-sm text-gray-700">Temperature Preferences (°C)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minTemp">Minimum Temperature</Label>
                <Input
                  id="minTemp"
                  type="number"
                  placeholder="e.g., 15"
                  value={filters.minTemp ?? ''}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    minTemp: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTemp">Maximum Temperature</Label>
                <Input
                  id="maxTemp"
                  type="number"
                  placeholder="e.g., 30"
                  value={filters.maxTemp ?? ''}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    maxTemp: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                  className="bg-white"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Budget/Food Price */}
          <div className="space-y-2">
            <Label htmlFor="maxFoodPrice">Maximum Average Food Price ($)</Label>
            <Input
              id="maxFoodPrice"
              type="number"
              placeholder="e.g., 15"
              value={filters.maxAvgFoodPrice ?? ''}
              onChange={(e) => setFilters({ 
                ...filters, 
                maxAvgFoodPrice: e.target.value ? parseFloat(e.target.value) : null 
              })}
              className="bg-white"
            />
            <p className="text-sm text-gray-500">Lower values favor budget-friendly destinations</p>
          </div>

          <Separator />

          {/* Hotel Preferences */}
          <div className="space-y-4">
            <h4 className="text-sm text-gray-700">Hotel Requirements</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minHotelRating">Minimum Hotel Rating</Label>
                <Input
                  id="minHotelRating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  placeholder="e.g., 3.5"
                  value={filters.minHotelRating ?? ''}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    minHotelRating: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minHotelCount">Minimum Number of Hotels</Label>
                <Input
                  id="minHotelCount"
                  type="number"
                  placeholder="e.g., 50"
                  value={filters.minHotelCount ?? ''}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    minHotelCount: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  className="bg-white"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Attractions/POI Preferences */}
          <div className="space-y-4">
            <h4 className="text-sm text-gray-700">Attraction Requirements</h4>
            
            <div className="space-y-2">
              <Label htmlFor="minPoiCount">Minimum Number of Attractions</Label>
              <Input
                id="minPoiCount"
                type="number"
                placeholder="e.g., 100"
                value={filters.minPoiCount ?? ''}
                onChange={(e) => setFilters({ 
                  ...filters, 
                  minPoiCount: e.target.value ? parseInt(e.target.value) : null 
                })}
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label>Preferred Attraction Categories (Optional)</Label>
              <div className="flex flex-wrap gap-2">
                {POI_CATEGORIES.map(category => (
                  <Badge
                    key={category}
                    variant={filters.preferredCategories.includes(category) ? 'default' : 'outline'}
                    className={`cursor-pointer transition-colors ${
                      filters.preferredCategories.includes(category)
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'hover:bg-indigo-50'
                    }`}
                    onClick={() => toggleCategory(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-gray-500">
                Select categories to prioritize destinations with those types of attractions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isLoading}
          size="lg"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
        >
          {isLoading ? (
            <>Finding destinations...</>
          ) : (
            <>
              <Send className="size-4 mr-2" />
              Find Top 5 Destinations
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
