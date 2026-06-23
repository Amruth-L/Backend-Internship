const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const distPath = path.join(__dirname, '..', 'frontend', 'dist');
const frontendPath = distPath;

app.use(express.static(frontendPath));

// Endpoint to get distinct categories
app.get('/api/categories', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT DISTINCT category FROM products ORDER BY category ASC');
    return res.json({ categories: rows.map(r => r.category) });
  } catch (err) {
    console.error('Error fetching categories:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to list products using cursor-based pagination with search, filter, and sort
app.get('/api/products', async (req, res) => {
  try {
    // Parse and validate limit (default 20, max 100)
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit <= 0) {
      limit = 20;
    } else if (limit > 100) {
      limit = 100;
    }

    const cursor = req.query.cursor;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'desc';

    // Whitelist allowed sort columns and directions
    const allowedSortColumns = ['created_at', 'name', 'price', 'updated_at'];
    const allowedSortOrders = ['asc', 'desc'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = allowedSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';

    // Build WHERE conditions and params dynamically
    const conditions = [];
    const queryParams = [];
    let paramIdx = 1;

    // Search filter (case-insensitive partial match on name)
    if (search.trim()) {
      conditions.push(`name ILIKE $${paramIdx}`);
      queryParams.push(`%${search.trim()}%`);
      paramIdx++;
    }

    // Category filter
    if (category.trim()) {
      conditions.push(`category = $${paramIdx}`);
      queryParams.push(category.trim());
      paramIdx++;
    }

    // Base query for total count (before adding cursor)
    const baseWhereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countQuery = `SELECT COUNT(*) FROM products ${baseWhereClause}`;
    const countResult = await db.query(countQuery, queryParams.slice(0, paramIdx - 1));
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Cursor-based pagination condition
    if (cursor) {
      try {
        const decodedStr = Buffer.from(cursor, 'base64').toString('utf-8');
        const cursorData = JSON.parse(decodedStr);

        if (!cursorData.sort_value || !cursorData.id) {
          return res.status(400).json({ error: 'Invalid cursor format.' });
        }

        const op = safeSortOrder === 'desc' ? '<' : '>';
        conditions.push(`(${safeSortBy}, id) ${op} ($${paramIdx}, $${paramIdx + 1})`);
        queryParams.push(cursorData.sort_value, cursorData.id);
        paramIdx += 2;
      } catch (err) {
        return res.status(400).json({ error: 'Failed to decode pagination cursor.' });
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Add limit param
    queryParams.push(limit + 1);
    const limitParam = `$${paramIdx}`;

    const queryText = `
      SELECT id, name, category, price, created_at, updated_at
      FROM products
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder.toUpperCase()}, id ${safeSortOrder.toUpperCase()}
      LIMIT ${limitParam}
    `;

    const { rows } = await db.query(queryText, queryParams);

    // Check if there is a next page
    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;

    let nextCursor = null;
    if (hasNextPage && data.length > 0) {
      const lastItem = data[data.length - 1];
      const cursorObj = {
        sort_value: lastItem[safeSortBy],
        id: lastItem.id
      };
      nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64');
    }

    return res.json({
      data,
      pagination: {
        next_cursor: nextCursor,
        has_more: hasNextPage,
        count: data.length,
        total_count: totalCount
      }
    });

  } catch (err) {
    console.error('Error fetching products:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('{*path}', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
