# Query 3 Optimization Report
## Route: POST /destinations/features

---

## Optimization Techniques Applied

### 1. Indexes Created
```
CREATE INDEX idx_hotels_cityid ON hotels(cityid);
CREATE INDEX idx_pois_cityid ON pois(cityid);
```

### 2. Query Reconstruction
- **Separated aggregations using CTEs**: Instead of joining hotels and pois together (causing row explosion), each table is aggregated independently in its own CTE
- **Early filtering with CTE**: Filter cities first in a `filtered_cities` CTE before joining to large tables
- **Eliminated COUNT(DISTINCT)**: Pre-aggregation in separate CTEs removes need for expensive distinct counting
- **Avoided cartesian product**: Original query multiplied hotels × pois per city; CTE approach processes them separately

---

## Pre-Optimization Query

```sql
EXPLAIN ANALYZE
SELECT
  c.cityid                    AS "cityId",
  c.name                      AS "cityName",
  co.countryid                AS "countryId",
  co.name                     AS "countryName",
  c.avgtemperaturelatestyear  AS "avgTemperature",
  c.avgfoodprice              AS "avgFoodPrice",
  AVG(h.rating)               AS "avgHotelRating",
  COUNT(DISTINCT h.hotelid)   AS "hotelCount",
  COUNT(DISTINCT p.poiid)     AS "poiCount",
  COUNT(DISTINCT CASE WHEN p.primarycategory = ANY(ARRAY['Sights & Landmarks', 'Museums']) THEN p.poiid END) AS "matchingPoiCount"
FROM cities c
JOIN countries co ON co.countryid = c.countryid
LEFT JOIN hotels h ON h.cityid = c.cityid
LEFT JOIN pois p ON p.cityid = c.cityid
WHERE c.avgtemperaturelatestyear >= 15
  AND c.avgtemperaturelatestyear <= 30
  AND c.avgfoodprice <= 50
GROUP BY
  c.cityid,
  c.name,
  co.countryid,
  co.name,
  c.avgtemperaturelatestyear,
  c.avgfoodprice
```

### Pre-Optimization EXPLAIN ANALYZE Output
```
GroupAggregate  (cost=46105.24..383894.71 rows=105350 width=100) (actual time=1542.543..35656.353 rows=897 loops=1)
"  Group Key: c.cityid, co.countryid"
  ->  Incremental Sort  (cost=46105.24..358194.77 rows=1393318 width=69) (actual time=1536.669..29138.260 rows=8972843 loops=1)
"        Sort Key: c.cityid, co.countryid, h.hotelid"
"        Presorted Key: c.cityid, co.countryid"
        Full-sort Groups: 416  Sort Method: quicksort  Average Memory: 30kB  Peak Memory: 30kB
"        Pre-sorted Groups: 618  Sort Methods: quicksort, external merge  Average Memory: 31kB  Peak Memory: 2388kB  Average Disk: 231001kB  Peak Disk: 446016kB"
        ->  Nested Loop Left Join  (cost=46102.46..312718.92 rows=1393318 width=69) (actual time=1533.364..9643.192 rows=8972843 loops=1)
              ->  Gather Merge  (cost=46102.02..50033.00 rows=33752 width=63) (actual time=1481.969..2663.414 rows=736412 loops=1)
                    Workers Planned: 2
                    Workers Launched: 2
                    ->  Sort  (cost=45102.00..45137.16 rows=14063 width=63) (actual time=1456.493..1759.117 rows=245471 loops=3)
"                          Sort Key: c.cityid, co.countryid"
                          Sort Method: external merge  Disk: 21352kB
                          Worker 0:  Sort Method: external merge  Disk: 21784kB
                          Worker 1:  Sort Method: external merge  Disk: 22368kB
                          ->  Hash Join  (cost=968.34..44133.09 rows=14063 width=63) (actual time=3.612..1243.541 rows=245471 loops=3)
                                Hash Cond: (c.countryid = co.countryid)
                                ->  Parallel Hash Right Join  (cost=960.83..44088.02 rows=14063 width=51) (actual time=3.474..1190.277 rows=245471 loops=3)
                                      Hash Cond: (p.cityid = c.cityid)
                                      ->  Parallel Seq Scan on pois p  (cost=0.00..41027.38 rows=799838 width=23) (actual time=1.602..973.857 rows=639809 loops=3)
                                      ->  Parallel Hash  (cost=957.67..957.67 rows=253 width=32) (actual time=1.785..2.981 rows=299 loops=3)
                                            Buckets: 1024  Batches: 1  Memory Usage: 72kB
                                            ->  Parallel Index Scan using cities_pkey on cities c  (cost=0.29..957.67 rows=253 width=32) (actual time=0.017..5.526 rows=897 loops=1)
                                                  Filter: ((avgtemperaturelatestyear >= '15'::numeric) AND (avgtemperaturelatestyear <= '30'::numeric) AND (avgfoodprice <= '50'::numeric))
                                                  Rows Removed by Filter: 23559
                                ->  Hash  (cost=4.45..4.45 rows=245 width=16) (actual time=0.099..0.398 rows=245 loops=3)
                                      Buckets: 1024  Batches: 1  Memory Usage: 20kB
                                      ->  Seq Scan on countries co  (cost=0.00..4.45 rows=245 width=16) (actual time=0.023..0.352 rows=245 loops=3)
              ->  Memoize  (cost=0.43..464.63 rows=147 width=10) (actual time=0.002..0.007 rows=11 loops=736412)
                    Cache Key: c.cityid
                    Cache Mode: logical
                    Hits: 735515  Misses: 897  Evictions: 0  Overflows: 0  Memory Usage: 2928kB
                    ->  Index Scan using idx_hotels_cityid on hotels h  (cost=0.42..464.62 rows=147 width=10) (actual time=0.805..4.981 rows=76 loops=897)
                          Index Cond: (cityid = c.cityid)
Planning Time: 4.712 ms
Execution Time: 35721.238 ms
```

---

## Post-Optimization Query

```sql
EXPLAIN ANALYZE
  WITH filtered_cities AS (
    SELECT c.cityid, c.name, c.countryid, c.avgtemperaturelatestyear, c.avgfoodprice
    FROM cities c
    WHERE c.avgtemperaturelatestyear >= 15
      AND c.avgtemperaturelatestyear <= 30
      AND c.avgfoodprice <= 50
  ),
  hotel_stats AS (
    SELECT h.cityid, AVG(h.rating) AS avg_rating, COUNT(*) AS hotel_count
    FROM hotels h
    INNER JOIN filtered_cities fc ON fc.cityid = h.cityid
    GROUP BY h.cityid
  ),
  poi_stats AS (
    SELECT p.cityid, COUNT(*) AS poi_count,
      COUNT(CASE WHEN p.primarycategory = ANY(ARRAY['Sights & Landmarks', 'Museums']) THEN 1 END) AS matching_poi_count
    FROM pois p
    INNER JOIN filtered_cities fc ON fc.cityid = p.cityid
    GROUP BY p.cityid
  )
  SELECT
    fc.cityid                    AS "cityId",
    fc.name                      AS "cityName",
    co.countryid                 AS "countryId",
    co.name                      AS "countryName",
    fc.avgtemperaturelatestyear  AS "avgTemperature",
    fc.avgfoodprice              AS "avgFoodPrice",
    COALESCE(hs.avg_rating, 0)   AS "avgHotelRating",
    COALESCE(hs.hotel_count, 0)  AS "hotelCount",
    COALESCE(ps.poi_count, 0)    AS "poiCount",
    COALESCE(ps.matching_poi_count, 0) AS "matchingPoiCount"
  FROM filtered_cities fc
  JOIN countries co ON co.countryid = fc.countryid
  LEFT JOIN hotel_stats hs ON hs.cityid = fc.cityid
  LEFT JOIN poi_stats ps ON ps.cityid = fc.cityid;
```

### Post-Optimization EXPLAIN ANALYZE Output
```
Hash Left Join  (cost=275953.23..275960.84 rows=2054 width=656) (actual time=13494.428..13507.155 rows=897 loops=1)
  Hash Cond: (fc.cityid = hs.cityid)
  CTE filtered_cities
    ->  Seq Scan on cities c  (cost=0.00..644.98 rows=430 width=32) (actual time=1.375..17.578 rows=897 loops=1)
          Filter: ((avgtemperaturelatestyear >= '15'::numeric) AND (avgtemperaturelatestyear <= '30'::numeric) AND (avgfoodprice <= '50'::numeric))
          Rows Removed by Filter: 23559
  ->  Merge Left Join  (cost=85327.89..85334.36 rows=430 width=616) (actual time=3665.238..3676.066 rows=897 loops=1)
        Merge Cond: (fc.cityid = ps.cityid)
        ->  Sort  (cost=36.07..37.15 rows=430 width=600) (actual time=19.164..24.540 rows=897 loops=1)
              Sort Key: fc.cityid
              Sort Method: quicksort  Memory: 81kB
              ->  Hash Join  (cost=7.51..17.26 rows=430 width=600) (actual time=2.050..19.393 rows=897 loops=1)
                    Hash Cond: (fc.countryid = co.countryid)
                    ->  CTE Scan on filtered_cities fc  (cost=0.00..8.60 rows=430 width=588) (actual time=1.379..17.925 rows=897 loops=1)
                    ->  Hash  (cost=4.45..4.45 rows=245 width=16) (actual time=0.090..0.096 rows=245 loops=1)
                          Buckets: 1024  Batches: 1  Memory Usage: 20kB
                          ->  Seq Scan on countries co  (cost=0.00..4.45 rows=245 width=16) (actual time=0.020..0.049 rows=245 loops=1)
        ->  Sort  (cost=85291.82..85292.54 rows=288 width=20) (actual time=3644.865..3646.676 rows=316 loops=1)
              Sort Key: ps.cityid
              Sort Method: quicksort  Memory: 37kB
              ->  Subquery Scan on ps  (cost=85274.29..85280.05 rows=288 width=20) (actual time=3639.214..3639.974 rows=316 loops=1)
                    ->  HashAggregate  (cost=85274.29..85277.17 rows=288 width=20) (actual time=3639.213..3639.942 rows=316 loops=1)
                          Group Key: p.cityid
                          Batches: 1  Memory Usage: 61kB
                          ->  Hash Join  (cost=13.97..72355.95 rows=1291834 width=19) (actual time=1.935..3352.913 rows=735831 loops=1)
                                Hash Cond: (p.cityid = fc_1.cityid)
                                ->  Seq Scan on pois p  (cost=0.00..52225.10 rows=1919610 width=19) (actual time=0.807..2300.252 rows=1919427 loops=1)
                                ->  Hash  (cost=8.60..8.60 rows=430 width=4) (actual time=1.114..1.122 rows=897 loops=1)
                                      Buckets: 1024  Batches: 1  Memory Usage: 40kB
                                      ->  CTE Scan on filtered_cities fc_1  (cost=0.00..8.60 rows=430 width=4) (actual time=0.003..0.108 rows=897 loops=1)
  ->  Hash  (cost=189954.68..189954.68 rows=2054 width=44) (actual time=9821.000..9821.004 rows=482 loops=1)
        Buckets: 4096  Batches: 1  Memory Usage: 60kB
        ->  Subquery Scan on hs  (cost=189908.47..189954.68 rows=2054 width=44) (actual time=9814.038..9815.613 rows=482 loops=1)
              ->  HashAggregate  (cost=189908.47..189934.14 rows=2054 width=44) (actual time=9814.036..9814.275 rows=482 loops=1)
                    Group Key: h.cityid
                    Batches: 1  Memory Usage: 241kB
                    ->  Hash Join  (cost=13.97..189435.68 rows=63038 width=6) (actual time=57.426..9686.963 rows=68057 loops=1)
                          Hash Cond: (h.cityid = fc_2.cityid)
                          ->  Seq Scan on hotels h  (cost=0.00..185005.51 rows=1009551 width=6) (actual time=20.835..9347.360 rows=1010033 loops=1)
                          ->  Hash  (cost=8.60..8.60 rows=430 width=4) (actual time=4.682..4.683 rows=897 loops=1)
                                Buckets: 1024  Batches: 1  Memory Usage: 40kB
                                ->  CTE Scan on filtered_cities fc_2  (cost=0.00..8.60 rows=430 width=4) (actual time=2.706..2.823 rows=897 loops=1)
Planning Time: 27.977 ms
Execution Time: 13544.411 ms

```

---

## Performance Summary

| Metric | Pre-Optimization | Post-Optimization | Improvement |
|--------|------------------|-------------------|-------------|
| Execution Time | 35,721 ms | 13,544 ms | **2.6x faster** |
| Planning Time | 4.7 ms | 28.0 ms | Increased (more complex plan) |
| Rows Processed | 8,972,843 intermediate rows | 735,831 + 68,057 rows | **~10x reduction** |
| Memory/Disk Usage | Peak 446MB disk (external merge) | In-memory only (241kB peak) | **Eliminated disk spill** |
| Scan Type (hotels) | Index Scan (via Memoize) | Seq Scan + Hash Join | Changed strategy |
| Scan Type (pois) | Parallel Seq Scan | Seq Scan + Hash Join | Similar approach |

### Key Performance Insights

1. **Execution Time**: Reduced from ~35.7 seconds to ~13.5 seconds (62% improvement)
2. **Disk I/O Eliminated**: Pre-optimization required external merge sorts spilling to disk (up to 446MB). Post-optimization runs entirely in memory.
3. **Row Explosion Avoided**: The original query's cartesian product between hotels and pois per city created 8.9M intermediate rows. The CTE approach processes each table independently.
4. **Trade-off**: Planning time increased from 4.7ms to 28ms due to the more complex CTE structure, but this is negligible compared to execution time savings.

---

## Query Reconstruction Explanation

### Original Query Problems

The pre-optimization query suffered from a **row explosion problem**:

```
cities (897 rows) × hotels (~76 per city) × pois (~820 per city) = 8,972,843 rows
```

This massive intermediate result set required:
- External merge sorts spilling 446MB to disk
- Expensive `COUNT(DISTINCT)` operations to de-duplicate
- Parallel workers struggling with data volume

### Reconstruction Strategy

#### Step 1: Early Filtering with CTE
```sql
WITH filtered_cities AS (
  SELECT c.cityid, c.name, c.countryid, c.avgtemperaturelatestyear, c.avgfoodprice
  FROM cities c
  WHERE c.avgtemperaturelatestyear >= 15
    AND c.avgtemperaturelatestyear <= 30
    AND c.avgfoodprice <= 50
)
```
- Filters 24,456 cities down to 897 matching cities upfront
- Result is materialized once and reused 3 times

#### Step 2: Pre-Aggregate Hotels Separately
```sql
hotel_stats AS (
  SELECT h.cityid, AVG(h.rating) AS avg_rating, COUNT(*) AS hotel_count
  FROM hotels h
  INNER JOIN filtered_cities fc ON fc.cityid = h.cityid
  GROUP BY h.cityid
)
```
- Joins only to filtered cities (897 rows)
- Aggregates 68,057 hotel rows → 482 result rows
- No cartesian product with POIs

#### Step 3: Pre-Aggregate POIs Separately
```sql
poi_stats AS (
  SELECT p.cityid, COUNT(*) AS poi_count,
    COUNT(CASE WHEN p.primarycategory = ANY(ARRAY['Sights & Landmarks', 'Museums']) THEN 1 END) AS matching_poi_count
  FROM pois p
  INNER JOIN filtered_cities fc ON fc.cityid = p.cityid
  GROUP BY p.cityid
)
```
- Joins only to filtered cities (897 rows)
- Aggregates 735,831 POI rows → 316 result rows
- No cartesian product with hotels

#### Step 4: Final Assembly
```sql
SELECT ...
FROM filtered_cities fc
JOIN countries co ON co.countryid = fc.countryid
LEFT JOIN hotel_stats hs ON hs.cityid = fc.cityid
LEFT JOIN poi_stats ps ON ps.cityid = fc.cityid
```
- Joins small, pre-aggregated result sets
- 897 × 1 × 1 = 897 final rows (no explosion)

### Why This Works

| Aspect | Original | Reconstructed |
|--------|----------|---------------|
| Join Order | cities → hotels → pois (multiplicative) | cities, then hotels separately, pois separately |
| Intermediate Rows | 8.9 million | 68K + 736K (processed separately) |
| Aggregation | Post-join DISTINCT counting | Pre-join GROUP BY |
| Memory | 446MB disk spill | 241KB in-memory |