const connection = require('../db');

// ----------------------
// Route 12: GET /recommendations/cities/top-attractions
// ----------------------
const get_recommendations_cities_top_attractions = async function (req, res) {
  const { limit = '10' } = req.query || {};
  const limitNum = parseInt(limit, 10);
  const limitEffective =
    Number.isInteger(limitNum) && limitNum > 0 ? limitNum : 10;

  const sql = `
    WITH city_poi_counts AS (
      SELECT 
        cityid,
        COUNT(poiid)::int AS poi_count
      FROM pois
      GROUP BY cityid
    )
    SELECT
      c.cityid                AS "cityId",
      c.name                  AS "name",
      co.countryid            AS "countryId",
      co.name                 AS "countryName",
      COALESCE(cpc.poi_count, 0)::int AS "poiCount"
    FROM cities c
    JOIN countries co ON co.countryid = c.countryid
    LEFT JOIN city_poi_counts cpc ON cpc.cityid = c.cityid
    ORDER BY
      "poiCount" DESC,
      "name" ASC
    LIMIT $1::int;
  `;

  try {
    const { rows } = await connection.query(sql, [limitEffective]);
    return res.json({
      cities: rows,
      limit: limitEffective,
    });
  } catch (err) {
    console.error("Route 12 error:", err);
    return res.status(500).json({
      error: "Database query failed",
      cities: [],
      limit: limitEffective,
    });
  }
};

// ----------------------
// Route 13: GET /recommendations/cities/warm-budget
// ----------------------
const get_recommendations_cities_warm_budget = async function (req, res) {
  const { limit = '10', minTemp = '18.0' } = req.query || {};

  const limitNum = parseInt(limit, 10);
  const minTempNum = Number(minTemp);

  const limitEffective =
    Number.isInteger(limitNum) && limitNum > 0 ? limitNum : 10;

  const minTempEffective =
    Number.isFinite(minTempNum) ? minTempNum : 18.0;

  // can tune the POI threshold
  const poiThreshold = 3;

  const sql = `
    WITH city_poi_counts AS (
      SELECT 
        cityid,
        COUNT(poiid)::int AS poi_count
      FROM pois
      GROUP BY cityid
    )
    SELECT
      c.cityid                         AS "cityId",
      c.name                           AS "name",
      co.countryid                     AS "countryId",
      co.name                          AS "countryName",
      c.avgtemperaturelatestyear::float8 AS "avgTemperature",
      c.avgfoodprice::float8           AS "avgFoodPrice",
      COALESCE(cpc.poi_count, 0)::int  AS "poiCount"
    FROM cities c
    JOIN countries co ON co.countryid = c.countryid
    LEFT JOIN city_poi_counts cpc ON cpc.cityid = c.cityid
    WHERE
      c.avgtemperaturelatestyear IS NOT NULL
      AND c.avgtemperaturelatestyear >= $2::numeric
      AND c.avgfoodprice IS NOT NULL
      AND COALESCE(cpc.poi_count, 0) >= $3::int
    ORDER BY
      c.avgfoodprice ASC,
      "poiCount" DESC,
      c.name ASC
    LIMIT $1::int;
  `;

  const params = [limitEffective, minTempEffective, poiThreshold];

  try {
    const { rows } = await connection.query(sql, params);
    return res.json({
      cities: rows,
      limit: limitEffective,
      minTemp: minTempEffective,
    });
  } catch (err) {
    console.error("Route 13 error:", err);
    return res.status(500).json({
      error: "Database query failed",
      cities: [],
      limit: limitEffective,
      minTemp: minTempEffective,
    });
  }
};

// ----------------------
// Route 14: GET /recommendations/cities/balanced
// ----------------------
const get_recommendations_cities_balanced = async function (req, res) {
  const { limit = '20' } = req.query || {};

  const limitNum = parseInt(limit, 10);
  const limitEffective =
    Number.isInteger(limitNum) && limitNum > 0 ? limitNum : 20;

  // Assumes city_stats_mv + its indexes already exist
  const sql = `
    WITH bounds AS (
        SELECT
            MIN(avgfoodprice)       AS min_food,
            MAX(avgfoodprice)       AS max_food,
            MIN(attraction_count)   AS min_attr,
            MAX(attraction_count)   AS max_attr,
            MIN(avg_hotel_rating)   AS min_rating,
            MAX(avg_hotel_rating)   AS max_rating
        FROM city_stats_mv
        -- ignore rows with completely missing data to avoid weird bounds
        WHERE avgfoodprice IS NOT NULL
          AND avg_hotel_rating IS NOT NULL
    ),
    scores AS (
        SELECT
            cs.cityid,
            cs.city_name,
            cs.country_name,
            cs.avgfoodprice,
            cs.attraction_count,
            cs.avg_hotel_rating,

            -- cheaper food is better
            (b.max_food - cs.avgfoodprice)
                / NULLIF(b.max_food - b.min_food, 0)         AS food_score,

            -- more attractions is better
            (cs.attraction_count - b.min_attr)
                / NULLIF(b.max_attr - b.min_attr, 0)         AS attraction_score,

            -- higher hotel rating is better
            (cs.avg_hotel_rating - b.min_rating)
                / NULLIF(b.max_rating - b.min_rating, 0)     AS rating_score
        FROM city_stats_mv cs
        CROSS JOIN bounds b
    ),
    ranked AS (
        SELECT
            cityid               AS "cityId",
            city_name            AS "cityName",
            country_name         AS "countryName",
            avgfoodprice::float8 AS "avgFoodPrice",
            attraction_count::int AS "attractionCount",
            avg_hotel_rating::float8 AS "avgHotelRating",
            food_score::float8       AS "foodScore",
            attraction_score::float8 AS "attractionsScore",
            rating_score::float8     AS "hotelScore",
            ((food_score + attraction_score + rating_score) / 3.0)::float8
                AS "compositeScore"
        FROM scores
    )
    SELECT *
    FROM ranked
    ORDER BY "compositeScore" DESC, "cityName" ASC
    LIMIT $1::int;
  `;

  try {
    const { rows } = await connection.query(sql, [limitEffective]);
    return res.json({
      cities: rows,
      limit: limitEffective,
    });
  } catch (err) {
    console.error("Route 14 error:", err);
    return res.status(500).json({
      error: "Database query failed",
      cities: [],
      limit: limitEffective,
    });
  }
};

// ----------------------
// Route 15: GET /recommendations/cities/best-per-country
// ----------------------
const get_recommendations_cities_best_per_country = async function (req, res) {
  const { minPoi = '5', minHotels = '5' } = req.query || {};

  const minPoiNum = parseInt(minPoi, 10);
  const minHotelsNum = parseInt(minHotels, 10);

  const minPoiEffective =
    Number.isInteger(minPoiNum) && minPoiNum > 0 ? minPoiNum : 5;
  const minHotelsEffective =
    Number.isInteger(minHotelsNum) && minHotelsNum > 0 ? minHotelsNum : 5;

  // Assumes city_quality_mv + its indexes already exist
  const sql = `
    WITH eligible_cities AS (
        SELECT
            cityid,
            countryid,
            poi_count,
            hotel_count,
            avg_hotel_rating
        FROM city_quality_mv
        WHERE poi_count        >= $1::int
          AND hotel_count      >= $2::int
          AND has_museum       = TRUE
          AND min_hotel_rating >= 2.5
    ),
    ranked AS (
        SELECT
            ec.*,
            ROW_NUMBER() OVER (
                PARTITION BY ec.countryid
                ORDER BY ec.avg_hotel_rating DESC
            ) AS rn
        FROM eligible_cities ec
    )
    SELECT
        r.countryid                    AS "countryId",
        co.name                        AS "countryName",
        r.cityid                       AS "cityId",
        c.name                         AS "cityName",
        r.poi_count::int              AS "poiCount",
        r.hotel_count::int            AS "hotelCount",
        r.avg_hotel_rating::float8    AS "avgHotelRating"
    FROM ranked r
    JOIN countries co ON co.countryid = r.countryid
    JOIN cities    c  ON c.cityid    = r.cityid
    WHERE r.rn = 1
    ORDER BY "countryName" ASC;
  `;

  const params = [minPoiEffective, minHotelsEffective];

  try {
    const { rows } = await connection.query(sql, params);
    return res.json({
      bestCities: rows,
      minPoi: minPoiEffective,
      minHotels: minHotelsEffective,
    });
  } catch (err) {
    console.error("Route 15 error:", err);
    return res.status(500).json({
      error: "Database query failed",
      bestCities: [],
      minPoi: minPoiEffective,
      minHotels: minHotelsEffective,
    });
  }
};

module.exports = {
  get_recommendations_cities_top_attractions,
  get_recommendations_cities_warm_budget,
  get_recommendations_cities_balanced,
  get_recommendations_cities_best_per_country
};