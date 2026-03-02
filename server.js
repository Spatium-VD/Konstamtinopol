/**
 * Серверная версия: раздача статики + локальная БД (data.json).
 * GET /api/data — отдать кэш. POST /api/refresh — забрать из GAS и сохранить.
 * Cron: 5 раз в день — обновление data.json из GAS.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cron = require('node-cron');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';

const emptyData = () => ({
  success: true,
  data: [],
  documents: [],
  accounts: { payments: [], transactions: [], breakdown: [] },
  timestamp: new Date().toISOString(),
  totalRecords: 0,
  totalDocuments: 0
});

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

function writeData(obj) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

async function fetchFromGAS() {
  if (!APPS_SCRIPT_URL) {
    throw new Error('APPS_SCRIPT_URL не задан (переменная окружения)');
  }
  const res = await fetch(APPS_SCRIPT_URL);
  if (!res.ok) throw new Error(`GAS HTTP ${res.status}`);
  const text = await res.text();
  const data = JSON.parse(text);
  return data;
}

async function refreshData() {
  const data = await fetchFromGAS();
  writeData(data);
  return data;
}

const app = express();

// GET /api/data — отдать локальный кэш
app.get('/api/data', (req, res) => {
  try {
    const data = readData();
    if (data) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(emptyData());
    }
  } catch (e) {
    console.error('GET /api/data error:', e);
    res.status(500).json({ success: false, error: String(e.message) });
  }
});

// POST /api/refresh — запрос к GAS, сохранить в data.json
app.post('/api/refresh', express.json(), async (req, res) => {
  try {
    await refreshData();
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ success: true });
  } catch (e) {
    console.error('POST /api/refresh error:', e);
    res.status(500).json({ success: false, error: String(e.message) });
  }
});

// Статика из текущей папки
app.use(express.static(__dirname, { index: 'index.html' }));

const server = http.createServer(app);

// Cron: 5 раз в день (00:00, 05:00, 10:00, 15:00, 20:00 по локальному времени сервера)
cron.schedule('0 0,5,10,15,20 * * *', async () => {
  if (!APPS_SCRIPT_URL) {
    console.warn('Cron: APPS_SCRIPT_URL не задан, пропуск');
    return;
  }
  try {
    await refreshData();
    console.log('Cron: data.json обновлён', new Date().toISOString());
  } catch (e) {
    console.error('Cron refresh error:', e);
  }
});

server.listen(PORT, () => {
  console.log(`Сервер: http://localhost:${PORT}`);
  if (!APPS_SCRIPT_URL) console.warn('Задайте APPS_SCRIPT_URL для /api/refresh и cron');
});
