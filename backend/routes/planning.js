const connection = require('../db');

// ----------------------
// Route 4: POST /planning/itineraries
// ----------------------
const post_planning_itineraries = async function (req, res) {
  const {
    level,
    cityId = null,
    countryId = null,
    numDays,
    maxCities = null,
    poisPerDay = 3,
    preferredCategoriesByDay = null,
    avoidCategories = []
  } = req.body || {};

  // Validation
  if (!level || (level !== 'city' && level !== 'country')) {
    return res.status(400).json({
      error: "level must be either 'city' or 'country'."
    });
  }

  if (level === 'city' && (!cityId || !Number.isInteger(Number(cityId)))) {
    return res.status(400).json({
      error: "cityId is required and must be an integer when level = 'city'."
    });
  }

  if (level === 'country' && (!countryId || !Number.isInteger(Number(countryId)))) {
    return res.status(400).json({
      error: "countryId is required and must be an integer when level = 'country'."
    });
  }

  if (!numDays || !Number.isInteger(Number(numDays)) || numDays <= 0) {
    return res.status(400).json({
      error: "numDays must be a positive integer."
    });
  }

  const numDaysEffective = Number(numDays);
  const poisPerDayEffective = Number.isInteger(Number(poisPerDay)) && poisPerDay > 0 
    ? Number(poisPerDay) 
    : 3;
  const avoidCategoriesArray = Array.isArray(avoidCategories) ? avoidCategories : [];

  try {
    let itinerary = [];
    let categoriesUsed = new Set();
    let citiesInItinerary = new Set();

    if (level === 'city') {
      // Single-city itinerary
      const cityIdNum = Number(cityId);
      
      // Get city info
      const cityInfoSql = `
        SELECT c.cityid, c.name AS city_name, c.countryid, co.name AS country_name
        FROM cities c
        JOIN countries co ON co.countryid = c.countryid
        WHERE c.cityid = $1;
      `;
      const cityInfoResult = await connection.query(cityInfoSql, [cityIdNum]);
      
      if (cityInfoResult.rows.length === 0) {
        return res.status(404).json({ error: "City not found." });
      }

      const cityInfo = cityInfoResult.rows[0];
      citiesInItinerary.add(cityIdNum);

      // Get POIs for this city
      const poisSql = `
        SELECT 
          poiid, 
          name, 
          cityid,
          address, 
          primarycategory
        FROM pois
        WHERE 
          cityid = $1
          AND ($2::text[] IS NULL OR NOT (primarycategory = ANY($2::text[])))
        ORDER BY RANDOM();
      `;
      
      const poisResult = await connection.query(poisSql, [
        cityIdNum,
        avoidCategoriesArray.length > 0 ? avoidCategoriesArray : null
      ]);

      const allPois = poisResult.rows;

      // Distribute POIs across days
      for (let day = 1; day <= numDaysEffective; day++) {
        const dayPreferredCategories = 
          preferredCategoriesByDay && 
          Array.isArray(preferredCategoriesByDay[day - 1])
            ? preferredCategoriesByDay[day - 1]
            : [];

        // Filter POIs for this day based on preferences
        let dayPois = [];
        let remainingPois = [...allPois];

        // First, try to match preferred categories
        if (dayPreferredCategories.length > 0) {
          const matchingPois = remainingPois.filter(poi =>
            dayPreferredCategories.includes(poi.primarycategory)
          );
          
          const numToTake = Math.min(poisPerDayEffective, matchingPois.length);
          dayPois = matchingPois.slice(0, numToTake);
          
          // Remove selected POIs from available pool
          const selectedIds = new Set(dayPois.map(p => p.poiid));
          remainingPois = remainingPois.filter(p => !selectedIds.has(p.poiid));
        }

        // Fill remaining slots with any available POIs
        if (dayPois.length < poisPerDayEffective && remainingPois.length > 0) {
          const numNeeded = poisPerDayEffective - dayPois.length;
          const additionalPois = remainingPois.slice(0, numNeeded);
          dayPois = [...dayPois, ...additionalPois];
          
          // Remove selected POIs
          const selectedIds = new Set(additionalPois.map(p => p.poiid));
          remainingPois = remainingPois.filter(p => !selectedIds.has(p.poiid));
        }

        // Update remaining POIs for next iteration
        allPois.length = 0;
        allPois.push(...remainingPois);

        // Format POIs for response
        const formattedPois = dayPois.map(poi => {
          categoriesUsed.add(poi.primarycategory);
          return {
            poiId: poi.poiid,
            name: poi.name,
            cityId: poi.cityid,
            category: poi.primarycategory,
            address: poi.address
          };
        });

        itinerary.push({
          dayNumber: day,
          cityId: cityInfo.cityid,
          cityName: cityInfo.city_name,
          countryId: cityInfo.countryid,
          countryName: cityInfo.country_name,
          categoryFocus: dayPreferredCategories,
          pois: formattedPois
        });
      }

    } else {
      // Multi-city itinerary (level = 'country')
      const countryIdNum = Number(countryId);
      
      // Get cities in this country with POI counts
      const citiesSql = `
        SELECT 
          c.cityid, 
          c.name AS city_name, 
          c.countryid,
          co.name AS country_name,
          COUNT(p.poiid) AS poi_count
        FROM cities c
        JOIN countries co ON co.countryid = c.countryid
        LEFT JOIN pois p ON p.cityid = c.cityid
          AND ($2::text[] IS NULL OR NOT (p.primarycategory = ANY($2::text[])))
        WHERE c.countryid = $1
        GROUP BY c.cityid, c.name, c.countryid, co.name
        HAVING COUNT(p.poiid) > 0
        ORDER BY COUNT(p.poiid) DESC;
      `;
      
      const citiesResult = await connection.query(citiesSql, [
        countryIdNum,
        avoidCategoriesArray.length > 0 ? avoidCategoriesArray : null
      ]);

      if (citiesResult.rows.length === 0) {
        return res.status(404).json({ 
          error: "No cities with POIs found in this country." 
        });
      }

      // Determine how many cities to use
      const maxCitiesEffective = maxCities && Number.isInteger(Number(maxCities)) && maxCities > 0
        ? Math.min(Number(maxCities), citiesResult.rows.length)
        : Math.min(Math.ceil(numDaysEffective / 2), citiesResult.rows.length);

      const selectedCities = citiesResult.rows.slice(0, maxCitiesEffective);
      
      // Calculate days per city (distribute evenly)
      const daysPerCity = Math.floor(numDaysEffective / selectedCities.length);
      const extraDays = numDaysEffective % selectedCities.length;

      let currentDay = 1;

      for (let i = 0; i < selectedCities.length; i++) {
        const city = selectedCities[i];
        const daysInThisCity = daysPerCity + (i < extraDays ? 1 : 0);
        citiesInItinerary.add(city.cityid);

        // Get POIs for this city
        const poisSql = `
          SELECT 
            poiid, 
            name, 
            cityid,
            address, 
            primarycategory
          FROM pois
          WHERE 
            cityid = $1
            AND ($2::text[] IS NULL OR NOT (primarycategory = ANY($2::text[])))
          ORDER BY RANDOM();
        `;
        
        const poisResult = await connection.query(poisSql, [
          city.cityid,
          avoidCategoriesArray.length > 0 ? avoidCategoriesArray : null
        ]);

        const allPois = poisResult.rows;

        // Distribute POIs across days in this city
        for (let dayInCity = 0; dayInCity < daysInThisCity; dayInCity++) {
          const dayPreferredCategories = 
            preferredCategoriesByDay && 
            Array.isArray(preferredCategoriesByDay[currentDay - 1])
              ? preferredCategoriesByDay[currentDay - 1]
              : [];

          // Filter POIs for this day
          let dayPois = [];
          let remainingPois = [...allPois];

          // Match preferred categories first
          if (dayPreferredCategories.length > 0) {
            const matchingPois = remainingPois.filter(poi =>
              dayPreferredCategories.includes(poi.primarycategory)
            );
            
            const numToTake = Math.min(poisPerDayEffective, matchingPois.length);
            dayPois = matchingPois.slice(0, numToTake);
            
            const selectedIds = new Set(dayPois.map(p => p.poiid));
            remainingPois = remainingPois.filter(p => !selectedIds.has(p.poiid));
          }

          // Fill remaining slots
          if (dayPois.length < poisPerDayEffective && remainingPois.length > 0) {
            const numNeeded = poisPerDayEffective - dayPois.length;
            const additionalPois = remainingPois.slice(0, numNeeded);
            dayPois = [...dayPois, ...additionalPois];
            
            const selectedIds = new Set(additionalPois.map(p => p.poiid));
            remainingPois = remainingPois.filter(p => !selectedIds.has(p.poiid));
          }

          // Update remaining POIs
          allPois.length = 0;
          allPois.push(...remainingPois);

          // Format POIs
          const formattedPois = dayPois.map(poi => {
            categoriesUsed.add(poi.primarycategory);
            return {
              poiId: poi.poiid,
              name: poi.name,
              cityId: poi.cityid,
              category: poi.primarycategory,
              address: poi.address
            };
          });

          itinerary.push({
            dayNumber: currentDay,
            cityId: city.cityid,
            cityName: city.city_name,
            countryId: city.countryid,
            countryName: city.country_name,
            categoryFocus: dayPreferredCategories,
            pois: formattedPois
          });

          currentDay++;
        }
      }
    }

    // Calculate summary
    const totalPois = itinerary.reduce((sum, day) => sum + day.pois.length, 0);

    const summary = {
      totalDays: numDaysEffective,
      totalCities: citiesInItinerary.size,
      totalPois: totalPois,
      categoriesUsed: Array.from(categoriesUsed)
    };

    return res.json({
      itinerary,
      summary
    });

  } catch (err) {
    console.error("Route 4 error:", err);
    return res.status(500).json({
      error: "Database query failed",
      itinerary: [],
      summary: {
        totalDays: 0,
        totalCities: 0,
        totalPois: 0,
        categoriesUsed: []
      }
    });
  }
};

module.exports = {
  post_planning_itineraries,
};