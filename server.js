const express = require("express");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const winston = require("winston");

const app = express();
const PORT = 4000;
const THIRD_PARTY_URL = "http://20.244.56.144/test"; // API URL

const windowSize = 10;
let numbers = new Set(); // Unique number storage

// ✅ Winston logger setup
const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
});

// ✅ Rate limiter (max 5 requests per second per IP)
const limiter = rateLimit({
    windowMs: 1000, // 1 second
    max: 5, // Max 5 requests per second
    message: { error: "Too many requests, slow down!" },
});

// 📌 Middleware for rate limiting
app.use(limiter);

// ✅ Fetch numbers from third-party API (ignoring responses > 500ms)
const fetchNumbers = async (type) => {
    try {
        const source = axios.CancelToken.source();
        setTimeout(() => source.cancel(), 500); // Cancel request after 500ms

        const response = await axios.get(`${THIRD_PARTY_URL}/${type}`, {
            timeout: 500,
            cancelToken: source.token,
        });

        console.log(`Fetched from API (${type}):`, response.data); // Debug log
        return response.data.numbers || [];
    } catch (error) {
        console.error(`Error fetching ${type}:`, error.message);
        return [];
    }
};


// ✅ Compute average of stored numbers
const calculateAverage = () => {
    const numArray = Array.from(numbers);
    const sum = numArray.reduce((acc, num) => acc + num, 0);
    return numArray.length > 0 ? sum / numArray.length : 0;
};

// ✅ Route to fetch & update numbers
app.get("/numbers/:type", async (req, res) => {
    const type = req.params.type;
    if (!["p", "f", "e", "r"].includes(type)) {
        return res.status(400).json({ error: "Invalid type. Use 'p', 'f', 'e', or 'r'." });
    }

    const prevState = Array.from(numbers); // Store previous state
    const newNumbers = await fetchNumbers(type);

    newNumbers.forEach((num) => {
        if (!numbers.has(num)) {
            if (numbers.size >= windowSize) {
                numbers.delete([...numbers][0]); // Remove oldest
            }
            numbers.add(num);
        }
    });

    const currentState = Array.from(numbers);
    const nextState = [...currentState];
    if (nextState.length >= windowSize) nextState.shift(); // Simulated next state

    const response = {
        windowPrevState: prevState,
        windowCurrState: currentState,
        numbers: newNumbers,
        avg: calculateAverage(),
    };

    logger.info(`Response: ${JSON.stringify(response)}`);
    res.json(response);
});

// ✅ Start server
app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
});
