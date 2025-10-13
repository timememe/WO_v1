const express = require('express');
const axios = require('axios');
const OpenAI = require('openai');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path'); 
const cron = require('node-cron');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

app.use(cors({
  origin: ['https://worldorder.online', 'https://6ed880de15.snack2win.com', 'https://oreo-promo.com', 
    'https://ec1fe6a45f.snack2win.com',  'https://ge.oreo-promo.com', 'https://inbusiness.kz']
}));

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// let newsArray = [];

// async function generateNews() {
//   // ... (закомментированный код генерации новостей)
// }

// async function updateNewsArray() {
//   // ... (закомментированный код обновления массива новостей)
// }

// // Запускаем обновление новостей каждые 24 часа
// cron.schedule('0 0 * * *', updateNewsArray);

// // Сразу запускаем первое обновление при старте сервера
// updateNewsArray();

// app.get('/get-news', (req, res) => {
//   // ... (закомментированный код для получения новостей)
// });

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let db;

async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db('oreoGameStats');
    
    // Initialize stats if they don't exist
    const stats = db.collection('stats');
    const existingStats = await stats.findOne({});
    if (!existingStats) {
      await stats.insertOne({
        game1: { wins: 0, losses: 0 },
        game2: { wins: 0, losses: 0 },
        dailyStats: {},
        languageStats: {
          ru: { game1: { wins: 0, losses: 0 }, game2: { wins: 0, losses: 0 } },
          kz: { game1: { wins: 0, losses: 0 }, game2: { wins: 0, losses: 0 } },
          ge: { game1: { wins: 0, losses: 0 }, game2: { wins: 0, losses: 0 } },
          az: { game1: { wins: 0, losses: 0 }, game2: { wins: 0, losses: 0 } }
        },
        dailyLanguageStats: {}
      });
    }

    // Initialize ar_clicks collection if it doesn't exist
    const arClicks = db.collection('ar_clicks');
    const existingArClicks = await arClicks.findOne({});
    if (!existingArClicks) {
      await arClicks.insertOne({
        totalClicks: 0,
        dailyClicks: {}
      });
    }
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

connectToDatabase();

app.post('/game-result', async (req, res) => {
  const { game, result, language } = req.body;

  if (!game || !result || !language || 
      (game !== 'game1' && game !== 'game2') || 
      (result !== 'win' && result !== 'loss') ||
      !['ru', 'kz', 'ge', 'az'].includes(language)) {
    return res.status(400).json({ error: 'Invalid input. Game must be "game1" or "game2", result must be "win" or "loss", and language must be "ru", "kz", "ge", or "az".' });
  }

  try {
    const stats = db.collection('stats');
    const updateField = result === 'win' ? 'wins' : 'losses';
    const today = new Date().toISOString().split('T')[0];

    // Update overall stats (unchanged)
    await stats.updateOne(
      {},
      { 
        $inc: { 
          [`${game}.${updateField}`]: 1,
          [`dailyStats.${today}.${game}.${updateField}`]: 1
        }
      },
      { upsert: true }
    );

    // Update language-specific stats
    await stats.updateOne(
      {},
      { 
        $inc: { 
          [`languageStats.${language}.${game}.${updateField}`]: 1,
          [`dailyLanguageStats.${today}.${language}.${game}.${updateField}`]: 1
        }
      },
      { upsert: true }
    );

    const updatedStats = await stats.findOne({});

    res.json({ 
      message: 'Game result recorded successfully',
      stats: updatedStats
    });
  } catch (error) {
    console.error('Error updating game stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/ar-click', async (req, res) => {
  try {
    const arClicks = db.collection('ar_clicks');
    const today = new Date().toISOString().split('T')[0];

    await arClicks.updateOne(
      {},
      { 
        $inc: { 
          totalClicks: 1,
          [`dailyClicks.${today}`]: 1
        }
      },
      { upsert: true }
    );

    const updatedClicks = await arClicks.findOne({});

    res.json({ 
      message: 'AR click recorded successfully',
      clicks: updatedClicks
    });
  } catch (error) {
    console.error('Error updating AR clicks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/game-stats', async (req, res) => {
  try {
    const stats = db.collection('stats');
    const gameStats = await stats.findOne({});
    res.json(gameStats);
  } catch (error) {
    console.error('Error fetching game stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Новый GET-эндпоинт для получения статистики кликов
app.get('/ar-clicks-stats', async (req, res) => {
  try {
    const arClicks = db.collection('ar_clicks');
    const clickStats = await arClicks.findOne({});
    
    if (!clickStats) {
      return res.status(404).json({ error: 'No click statistics found' });
    }

    // Вычисляем статистику за последние 7 дней
    const last7Days = {};
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      last7Days[dateString] = clickStats.dailyClicks[dateString] || 0;
    }

    res.json({
      totalClicks: clickStats.totalClicks,
      dailyClicks: clickStats.dailyClicks,
      last7DaysClicks: last7Days
    });
  } catch (error) {
    console.error('Error fetching AR click stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/oreo-stats', async (req, res) => {
  try {
    const stats = db.collection('stats');
    const gameStats = await stats.findOne({});
    res.json(gameStats);
  } catch (error) {
    console.error('Error fetching game stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT. Closing MongoDB connection before exit...');
  await client.close();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});