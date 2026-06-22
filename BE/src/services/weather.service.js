const User = require('../models/User');
const EventRegistration = require('../models/EventRegistration');

const WEATHER_LOCATION = 'Da Nang,VN';
const OPENWEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const ADVICE_CACHE_TTL_MS = 10 * 60 * 1000;
let weatherCache = null; // { data, fetchedAt }

const fetchCurrentWeather = async () => {
  if (weatherCache && Date.now() - weatherCache.fetchedAt < ADVICE_CACHE_TTL_MS) {
    return weatherCache.data;
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENWEATHER_API_KEY chưa được cấu hình trên server.');
  }

  const url = `${OPENWEATHER_URL}?q=${encodeURIComponent(WEATHER_LOCATION)}&units=metric&lang=vi&appid=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenWeatherMap lỗi (${response.status}): ${errText}`);
  }
  const data = await response.json();

  const weather = {
    temp: Math.round(data.main?.temp),
    feelsLike: Math.round(data.main?.feels_like),
    humidity: data.main?.humidity,
    windSpeed: data.wind?.speed,
    description: data.weather?.[0]?.description || '',
    icon: data.weather?.[0]?.icon || '01d',
    main: data.weather?.[0]?.main || 'Clear',
    rainVolume: data.rain?.['1h'] || 0,
  };

  weatherCache = { data: weather, fetchedAt: Date.now() };
  return weather;
};

const getUpcomingRegisteredEvents = async (authEmail) => {
  if (!authEmail) return [];

  const user = await User.findOne({ email: authEmail }).select('_id').lean();
  if (!user) return [];

  const now = new Date();
  const horizon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const registrations = await EventRegistration.find({ user: user._id, status: 'registered' })
    .populate({
      path: 'event',
      select: 'title startDate endDate location campus isHidden isDeleted status',
    })
    .lean();

  return registrations
    .map((r) => r.event)
    .filter((e) => e && !e.isHidden && !e.isDeleted)
    .filter((e) => e.startDate && new Date(e.startDate) <= horizon && new Date(e.endDate || e.startDate) >= now)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
};

const buildGenericAdvicePrompt = (weather) => `Bạn là trợ lý thời tiết ngắn gọn cho sinh viên FPT University (Đà Nẵng).
Thời tiết hiện tại: ${weather.description}, ${weather.temp}°C (cảm giác như ${weather.feelsLike}°C), độ ẩm ${weather.humidity}%, gió ${weather.windSpeed} m/s.
Người dùng không có sự kiện nào sắp tham gia. Hãy đưa ra MỘT lời khuyên ngắn (tối đa 1 câu, dưới 18 từ), tiếng Việt, tự nhiên, không emoji, không liệt kê.`;

const buildEventAdvicePrompt = (weather, events) => {
  const eventsBlock = events
    .slice(0, 3)
    .map((e, i) => {
      const start = new Date(e.startDate).toLocaleString('vi-VN');
      return `${i + 1}. "${e.title}" lúc ${start} tại ${e.location || e.campus || 'chưa rõ địa điểm'}`;
    })
    .join('\n');

  return `Bạn là trợ lý thời tiết cho sinh viên FPT University (Đà Nẵng).
Thời tiết hiện tại: ${weather.description}, ${weather.temp}°C (cảm giác như ${weather.feelsLike}°C), độ ẩm ${weather.humidity}%, gió ${weather.windSpeed} m/s.
Người dùng có các sự kiện sắp tham gia sau:
${eventsBlock}
Hãy phân tích thời tiết và đưa ra lời khuyên ngắn (tối đa 2 câu, dưới 30 từ) về việc nên chuẩn bị gì hoặc lưu ý gì khi tham gia sự kiện này, tiếng Việt, tự nhiên, không emoji, không liệt kê gạch đầu dòng.`;
};

const askGeminiAdvice = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();
    return text || null;
  } catch {
    return null;
  }
};

const FALLBACK_ADVICE = {
  Rain: 'Trời có mưa, bạn nhớ mang theo áo mưa hoặc ô khi ra ngoài nhé.',
  Thunderstorm: 'Có giông sét, hạn chế di chuyển ngoài trời nếu không cần thiết.',
  Clear: 'Trời nắng đẹp, đừng quên thoa kem chống nắng nếu ra ngoài lâu.',
  Clouds: 'Trời nhiều mây, thời tiết khá dịu, thuận tiện cho các hoạt động ngoài trời.',
  default: 'Theo dõi thời tiết và chuẩn bị trang phục phù hợp khi ra ngoài.',
};

const getWeatherWithAdvice = async ({ authEmail } = {}) => {
  const weather = await fetchCurrentWeather();
  const upcomingEvents = await getUpcomingRegisteredEvents(authEmail);

  const prompt = upcomingEvents.length
    ? buildEventAdvicePrompt(weather, upcomingEvents)
    : buildGenericAdvicePrompt(weather);

  const aiAdvice = await askGeminiAdvice(prompt);
  const advice = aiAdvice || FALLBACK_ADVICE[weather.main] || FALLBACK_ADVICE.default;

  return { weather, advice, hasUpcomingEvent: upcomingEvents.length > 0 };
};

module.exports = { getWeatherWithAdvice };
