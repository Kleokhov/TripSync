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
    SELECT
      c.cityid                AS "cityId",
      c.name                  AS "name",
      co.countryid            AS "countryId",
      co.name                 AS "countryName",
      COUNT(p.poiid)::int     AS "poiCount"
    FROM cities c
    JOIN countries co
      ON co.countryid = c.countryid
    LEFT JOIN pois p
      ON p.cityid = c.cityid
    GROUP BY
      c.cityid,
      c.name,
      co.countryid,
      co.name
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
    SELECT
      c.cityid                         AS "cityId",
      c.name                           AS "name",
      co.countryid                     AS "countryId",
      co.name                          AS "countryName",
      c.avgtemperaturelatestyear::float8 AS "avgTemperature",
      c.avgfoodprice::float8           AS "avgFoodPrice",
      COUNT(p.poiid)::int              AS "poiCount"
    FROM cities c
    JOIN countries co
      ON co.countryid = c.countryid
    LEFT JOIN pois p
      ON p.cityid = c.cityid
    WHERE
      c.avgtemperaturelatestyear IS NOT NULL
      AND c.avgtemperaturelatestyear >= $2::numeric
      AND c.avgfoodprice IS NOT NULL
    GROUP BY
      c.cityid,
      c.name,
      co.countryid,
      co.name,
      c.avgtemperaturelatestyear,
      c.avgfoodprice
    HAVING COUNT(p.poiid) >= $3::int
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

module.exports = {
  get_recommendations_cities_top_attractions,
  get_recommendations_cities_warm_budget,
};