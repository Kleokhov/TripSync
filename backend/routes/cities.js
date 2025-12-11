const connection = require('../db');

// ----------------------
// Route 8: GET /cities
// ----------------------
const get_cities = async function (req, res) {
  // Define page and pageSize outside try block for catch block access
  let page = 1;
  let pageSize = 20;

  try {
    const search = req.query.search || null;
    const countryId = req.query.countryId
      ? parseInt(req.query.countryId, 10)
      : null;
    const minTemp = req.query.minTemp != null ? parseFloat(req.query.minTemp) : null;
    const maxTemp = req.query.maxTemp != null ? parseFloat(req.query.maxTemp) : null;
    const maxFood = req.query.maxFood != null ? parseFloat(req.query.maxFood) : null;
    page = Math.max(parseInt(req.query.page || '1', 10), 1);
    pageSize = Math.max(parseInt(req.query.pageSize || '20', 10), 1);
    const limit = pageSize;
    const offset = (page - 1) * pageSize;

    const params = [];
    const where = [];
    let idx = 1;

    if (search) {
      where.push(`c.name ILIKE $${idx}`);
      params.push(`%${search}%`);
      idx++;
    }

    if (countryId != null && !Number.isNaN(countryId)) {
      where.push(`c.countryid = $${idx}`);
      params.push(countryId);
      idx++;
    }

    if (minTemp != null) {
      where.push(`c.avgtemperaturelatestyear >= $${idx}`);
      params.push(minTemp);
      idx++;
    }

    if (maxTemp != null) {
      where.push(`c.avgtemperaturelatestyear <= $${idx}`);
      params.push(maxTemp);
      idx++;
    }

    if (maxFood != null) {
      where.push(`c.avgfoodprice <= $${idx}`);
      params.push(maxFood);
      idx++;
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalResult = await connection.query(
      `
      SELECT COUNT(*) AS total
      FROM cities c
      ${whereClause}
    `,
      params,
    );
    const total = parseInt(totalResult.rows[0].total, 10);

    // Add limit and offset as parameters
    const limitIdx = idx;
    const offsetIdx = idx + 1;
    params.push(limit);
    params.push(offset);

    const cityResult = await connection.query(
      `
      SELECT
        c.cityid                   AS "cityId",
        c.name                     AS "name",
        c.countryid                AS "countryId",
        co.name                    AS "countryName",
        c.latitude                 AS "latitude",
        c.longitude                AS "longitude",
        c.avgtemperaturelatestyear AS "avgTemperature",
        c.avgfoodprice             AS "avgFoodPrice",
        c.avggasprice              AS "avgGasPrice",
        c.avgmonthlysalary         AS "avgMonthlySalary"
      FROM cities c
      JOIN countries co ON co.countryid = c.countryid
      ${whereClause}
      ORDER BY c.name
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `,
      params,
    );

    res.json({
      cities: cityResult.rows.map((r) => ({
        cityId: r.cityId,
        name: r.name,
        countryId: r.countryId,
        countryName: r.countryName,
        latitude: r.latitude,
        longitude: r.longitude,
        avgTemperature: r.avgTemperature,
        avgFoodPrice: r.avgFoodPrice,
        avgGasPrice: r.avgGasPrice,
        avgMonthlySalary: r.avgMonthlySalary,
      })),
      page,
      pageSize,
      total,
    });
  } catch (err) {
    console.error('Route 8 error:', err);
    return res.status(500).json({
      error: 'Database query failed',
      cities: [],
      page,
      pageSize,
      total: 0
    });
  }
};

// ----------------------
// Route 9: GET /cities/:cityId
// ----------------------
const get_city_by_id = async function (req, res) {
  const { cityId } = req.params || {};
  const cityIdNum = parseInt(cityId, 10);

  if (!Number.isInteger(cityIdNum) || cityIdNum <= 0) {
    return res.status(400).json({
      error: "cityId must be a positive integer.",
    });
  }

  const sql = `
    SELECT
      c.cityid                         AS "cityId",
      c.countryid                      AS "countryId",
      c.name                           AS "name",
      c.latitude::float8               AS "latitude",
      c.longitude::float8              AS "longitude",
      c.avgtemperaturelatestyear::float8 AS "avgTemperature",
      c.latesttempyear                 AS "latestTempYear",
      c.avgfoodprice::float8           AS "avgFoodPrice",
      c.avggasprice::float8            AS "avgGasPrice",
      c.avgmonthlysalary::float8       AS "avgMonthlySalary",
      COUNT(DISTINCT p.poiid)::int     AS "poiCount",
      COUNT(DISTINCT h.hotelid)::int   AS "hotelCount",
      AVG(h.rating)::float8            AS "avgHotelRating"
    FROM cities c
    LEFT JOIN pois p
      ON p.cityid = c.cityid
    LEFT JOIN hotels h
      ON h.cityid = c.cityid
    WHERE c.cityid = $1
    GROUP BY
      c.cityid,
      c.countryid,
      c.name,
      c.latitude,
      c.longitude,
      c.avgtemperaturelatestyear,
      c.latesttempyear,
      c.avgfoodprice,
      c.avggasprice,
      c.avgmonthlysalary;
  `;

  try {
    const { rows } = await connection.query(sql, [cityIdNum]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "City not found." });
    }

    // Single city object
    return res.json(rows[0]);
  } catch (err) {
    console.error("Route 9 error:", err);
    return res.status(500).json({
      error: "Database query failed",
    });
  }
};

// ----------------------
// Route 10: GET /cities/:cityId/pois
// ----------------------
const get_city_pois = async function (req, res) {
  const { cityId } = req.params || {};
  const { category = null, limit = '50' } = req.query || {};

  const cityIdNum = parseInt(cityId, 10);
  const limitNum = parseInt(limit, 10);

  if (!Number.isInteger(cityIdNum) || cityIdNum <= 0) {
    return res.status(400).json({
      error: "cityId must be a positive integer.",
    });
  }

  const limitEffective =
    Number.isInteger(limitNum) && limitNum > 0 ? limitNum : 50;

  const categoryFilter =
    typeof category === 'string' && category.trim().length > 0
      ? category.trim()
      : null;

  const sql = `
    SELECT
      p.poiid            AS "poiId",
      p.name             AS "name",
      p.latitude::float8 AS "latitude",
      p.longitude::float8 AS "longitude",
      p.address          AS "address",
      p.primarycategory  AS "primaryCategory"
    FROM pois p
    WHERE
      p.cityid = $1
      AND ($2::text IS NULL OR p.primarycategory = $2::text)
    ORDER BY p.name ASC
    LIMIT $3::int;
  `;

  const params = [cityIdNum, categoryFilter, limitEffective];

  try {
    const { rows } = await connection.query(sql, params);
    return res.json({ pois: rows });
  } catch (err) {
    console.error("Route 10 error:", err);
    return res.status(500).json({
      error: "Database query failed",
      pois: [],
    });
  }
};

// ----------------------
// Route 11: GET /cities/:cityId/hotels
// ----------------------
const get_city_hotels = async function (req, res) {
  const { cityId } = req.params || {};
  const { minRating = null, limit = '50' } = req.query || {};

  const cityIdNum = parseInt(cityId, 10);
  const limitNum = parseInt(limit, 10);
  const minRatingNum =
    minRating !== null && minRating !== undefined
      ? Number(minRating)
      : null;

  if (!Number.isInteger(cityIdNum) || cityIdNum <= 0) {
    return res.status(400).json({
      error: "cityId must be a positive integer.",
    });
  }

  const limitEffective =
    Number.isInteger(limitNum) && limitNum > 0 ? limitNum : 50;

  const sql = `
    SELECT
      h.hotelid    AS "hotelId",
      h.name       AS "name",
      h.rating::float8 AS "rating",
      h.address    AS "address",
      h.description AS "description"
    FROM hotels h
    WHERE
      h.cityid = $1
      AND ($2::numeric IS NULL OR h.rating >= $2::numeric)
    ORDER BY
      h.rating DESC NULLS LAST,
      h.name ASC
    LIMIT $3::int;
  `;

  const params = [cityIdNum, minRatingNum, limitEffective];

  try {
    const { rows } = await connection.query(sql, params);
    return res.json({ hotels: rows });
  } catch (err) {
    console.error("Route 11 error:", err);
    return res.status(500).json({
      error: "Database query failed",
      hotels: [],
    });
  }
};

module.exports = {
  get_cities,
  get_city_by_id,
  get_city_pois,
  get_city_hotels,
};