const connection = require('../db');

// ----------------------
// Route 6: GET /countries
// ----------------------
const get_countries = async function (req, res) {
  const { search = null, page = '1', pageSize = '20' } = req.query || {};

  // Coerce page + pageSize
  const pageNum = parseInt(page, 10);
  const pageSizeNum = parseInt(pageSize, 10);

  const pageEffective =
    Number.isInteger(pageNum) && pageNum >= 1 ? pageNum : 1;
  const pageSizeEffective =
    Number.isInteger(pageSizeNum) && pageSizeNum >= 1 ? pageSizeNum : 20;

  const offset = (pageEffective - 1) * pageSizeEffective;
  const limit = pageSizeEffective;

  // Normalize search term: null means "no filter"
  const searchTerm =
    typeof search === 'string' && search.trim().length > 0
      ? search.trim()
      : null;

  // Query 1: total count (for pagination)
  const sqlCount = `
    SELECT COUNT(*) AS total
    FROM countries co
    WHERE
      ($1::text IS NULL
       OR co.name ILIKE '%' || $1::text || '%'
       OR co.other_name ILIKE '%' || $1::text || '%');
  `;

  // Query 2: paginated list with cityCount
  const sqlList = `
    SELECT
      co.countryid              AS "countryId",
      co.name                   AS "name",
      co.alpha_2_country_code   AS "alpha2Code",
      co.alpha_3_country_code   AS "alpha3Code",
      co.other_name             AS "otherName",
      co.gdp::float8            AS "gdp",
      co.avg_heat_index::float8 AS "avgHeatIndex",
      COUNT(ci.cityid)          AS "cityCount"
    FROM countries co
    LEFT JOIN cities ci
      ON ci.countryid = co.countryid
    WHERE
      ($1::text IS NULL
       OR co.name ILIKE '%' || $1::text || '%'
       OR co.other_name ILIKE '%' || $1::text || '%')
    GROUP BY
      co.countryid,
      co.name,
      co.alpha_2_country_code,
      co.alpha_3_country_code,
      co.other_name,
      co.gdp,
      co.avg_heat_index
    ORDER BY co.name ASC
    LIMIT $2::int
    OFFSET $3::int;
  `;

  try {
    // total count
    const countResult = await connection.query(sqlCount, [searchTerm]);
    const total = Number(countResult.rows[0]?.total) || 0;

    // paginated rows
    const listResult = await connection.query(sqlList, [
      searchTerm,
      limit,
      offset,
    ]);

    const countries = listResult.rows;

    return res.json({
      countries,
      page: pageEffective,
      pageSize: pageSizeEffective,
      total,
    });
  } catch (err) {
    console.error('Route 6 error:', err);
    return res.status(500).json({
      error: 'Database query failed',
      countries: [],
      page: pageEffective,
      pageSize: pageSizeEffective,
      total: 0,
    });
  }
};

// ----------------------
// Route 7: GET /countries/:countryId
// ----------------------
const get_country_by_id = async function (req, res) {
  try {
    const countryId = parseInt(req.params.countryId, 10);
    if (Number.isNaN(countryId)) {
      return res.status(400).json({ error: 'countryId must be an integer' });
    }

    const { rows } = await connection.query(
      `
      SELECT
        co.countryid            AS "countryId",
        co.name                 AS "name",
        co.alpha_2_country_code AS "alpha2Code",
        co.alpha_3_country_code AS "alpha3Code",
        co.other_name           AS "otherName",
        co.gdp                  AS "gdp",
        co.avg_heat_index       AS "avgHeatIndex",
        AVG(ci.avgtemperaturelatestyear) AS "avgCityTemperature",
        AVG(ci.avgfoodprice)            AS "avgFoodPrice",
        AVG(ci.avggasprice)             AS "avgGasPrice",
        AVG(ci.avgmonthlysalary)        AS "avgMonthlySalary",
        COUNT(ci.cityid)                AS "cityCount"
      FROM countries co
      LEFT JOIN cities ci
        ON ci.countryid = co.countryid
      WHERE co.countryid = $1
      GROUP BY
        co.countryid,
        co.name,
        co.alpha_2_country_code,
        co.alpha_3_country_code,
        co.other_name,
        co.gdp,
        co.avg_heat_index
    `,
      [countryId],
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Country not found' });
    }

    const country = rows[0];

    const { rows: exampleCities } = await connection.query(
      `
      SELECT
        cityid AS "cityId",
        name   AS "cityName"
      FROM cities
      WHERE countryid = $1
      ORDER BY name
      LIMIT 5
    `,
      [countryId],
    );

    res.json({
      countryId: country.countryId,
      name: country.name,
      alpha2Code: country.alpha2Code,
      alpha3Code: country.alpha3Code,
      otherName: country.otherName,
      gdp: country.gdp,
      avgHeatIndex: country.avgHeatIndex,
      avgCityTemperature: country.avgCityTemperature,
      avgFoodPrice: country.avgFoodPrice,
      avgGasPrice: country.avgGasPrice,
      avgMonthlySalary: country.avgMonthlySalary,
      cityCount: Number(country.cityCount),
      exampleCities: exampleCities.map((c) => ({
        cityId: c.cityId,
        cityName: c.cityName,
      })),
    });
  } catch (err) {
    console.error('Route 7 error:', err);
    return res.status(500).json({
      error: 'Database query failed'
    });
  }
};

module.exports = {
  get_countries,
  get_country_by_id,
};