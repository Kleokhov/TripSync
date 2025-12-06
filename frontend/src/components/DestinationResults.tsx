import { Trophy, MapPin, Utensils, Hotel, Star, ArrowLeft, Thermometer, MapPinned } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { DestinationMatch } from '../App';

interface DestinationResultsProps {
  results: DestinationMatch[];
  onReset: () => void;
}

export function DestinationResults({ results, onReset }: DestinationResultsProps) {
  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return 'bg-yellow-500';
      case 1: return 'bg-gray-400';
      case 2: return 'bg-amber-600';
      default: return 'bg-indigo-400';
    }
  };

  const getRankLabel = (index: number) => {
    switch (index) {
      case 0: return '1st';
      case 1: return '2nd';
      case 2: return '3rd';
      case 3: return '4th';
      case 4: return '5th';
      default: return `${index + 1}th`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl text-indigo-900 mb-2">Top 5 Destinations</h2>
          <p className="text-gray-600">
            Ranked by composite score based on food prices, hotels, and attractions
          </p>
        </div>
        <Button
          onClick={onReset}
          variant="outline"
          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
        >
          <ArrowLeft className="size-4 mr-2" />
          New Search
        </Button>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {results.map((destination, index) => (
          <Card 
            key={destination.id} 
            className={`bg-white/80 backdrop-blur shadow-lg border-indigo-100 transition-all hover:shadow-xl hover:scale-[1.02] ${
              index === 0 ? 'ring-2 ring-yellow-400' : ''
            }`}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  {/* Rank Badge */}
                  <div className={`${getRankColor(index)} text-white rounded-full size-12 flex items-center justify-center shrink-0`}>
                    {index === 0 ? (
                      <Trophy className="size-6" />
                    ) : (
                      <span>{getRankLabel(index)}</span>
                    )}
                  </div>

                  {/* City Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>{destination.name}</CardTitle>
                      {index === 0 && (
                        <Badge className="bg-yellow-500 text-white border-yellow-600">
                          Best Match
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <MapPin className="size-4" />
                      {destination.countryName}
                    </CardDescription>
                  </div>
                </div>

                {/* Overall Match Score */}
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-indigo-600 mb-1">
                    <Star className="size-5 fill-indigo-600" />
                    <span className="text-2xl">{destination.compositeScore.toFixed(0)}%</span>
                  </div>
                  <p className="text-sm text-gray-500">Match Score</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Match Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Utensils className="size-4" />
                      Food/Budget Score
                    </span>
                    <span>{destination.foodScore.toFixed(0)}%</span>
                  </div>
                  <Progress value={destination.foodScore} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-gray-600">
                      <MapPinned className="size-4" />
                      Attractions Score
                    </span>
                    <span>{destination.attractionsScore.toFixed(0)}%</span>
                  </div>
                  <Progress value={destination.attractionsScore} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Hotel className="size-4" />
                      Hotels Score
                    </span>
                    <span>{destination.hotelScore.toFixed(0)}%</span>
                  </div>
                  <Progress value={destination.hotelScore} className="h-2" />
                </div>
              </div>

              {/* City Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                {destination.avgTemperature !== null && (
                  <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <Thermometer className="size-4 text-orange-600" />
                    <div>
                      <p className="text-xs text-gray-600">Avg Temp</p>
                      <p className="text-sm text-gray-900">{destination.avgTemperature.toFixed(1)}°C</p>
                    </div>
                  </div>
                )}
                
                {destination.avgFoodPrice !== null && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <Utensils className="size-4 text-green-600" />
                    <div>
                      <p className="text-xs text-gray-600">Avg Food</p>
                      <p className="text-sm text-gray-900">${destination.avgFoodPrice.toFixed(1)}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Hotel className="size-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-600">Hotels</p>
                    <p className="text-sm text-gray-900">
                      {destination.hotelCount} 
                      {destination.avgHotelRating && (
                        <span className="text-xs ml-1">({destination.avgHotelRating.toFixed(1)}★)</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <MapPinned className="size-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-600">Attractions</p>
                    <p className="text-sm text-gray-900">{destination.poiCount} POIs</p>
                  </div>
                </div>
              </div>

              {/* Sample Attractions */}
              {destination.sampleAttractions.length > 0 && (
                <div>
                  <h4 className="text-sm text-gray-600 mb-2">Featured Attractions</h4>
                  <div className="flex flex-wrap gap-2">
                    {destination.sampleAttractions.map((attraction) => (
                      <Badge 
                        key={attraction.poiId} 
                        variant="secondary"
                        className="bg-indigo-50 text-indigo-700"
                      >
                        {attraction.name}
                        <span className="ml-1 text-xs text-indigo-500">({attraction.category})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="text-center pt-4">
        <p className="text-gray-500 mb-4">
          Ready to plan your trip to these destinations?
        </p>
        <div className="flex gap-3 justify-center">
          <Button 
            variant="outline"
            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            Create Itinerary
          </Button>
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            View Detailed Info
          </Button>
        </div>
      </div>
    </div>
  );
}