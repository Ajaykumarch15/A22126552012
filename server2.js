const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;
const API_BASE_URL = "http://socialmedia-test-server.com"; // Replace with actual API

// Caching for efficient storage
let userPostCounts = {};
let postsCache = [];

// Fetch all users and count posts
const fetchUsers = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/users`);
        const users = response.data;

        // Count posts per user
        userPostCounts = {};
        users.forEach(user => {
            userPostCounts[user.id] = user.posts.length;
        });

        return users;
    } catch (error) {
        console.error("Error fetching users:", error.message);
        return [];
    }
};

// Fetch all posts
const fetchPosts = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/posts`);
        postsCache = response.data;
        return postsCache;
    } catch (error) {
        console.error("Error fetching posts:", error.message);
        return [];
    }
};

// 📌 GET Top 5 Users with Most Posts
app.get("/users", async (req, res) => {
    await fetchUsers();
    const sortedUsers = Object.entries(userPostCounts)
        .sort((a, b) => b[1] - a[1]) // Sort by post count (descending)
        .slice(0, 5) // Take top 5 users
        .map(([userId, postCount]) => ({ userId, postCount }));

    res.json(sortedUsers);
});

// 📌 GET Popular or Latest Posts
app.get("/posts", async (req, res) => {
    const { type } = req.query;
    if (!type || !["latest", "popular"].includes(type)) {
        return res.status(400).json({ error: "Invalid query param. Use 'latest' or 'popular'." });
    }

    const posts = await fetchPosts();

    if (type === "popular") {
        const maxComments = Math.max(...posts.map(post => post.comments.length));
        const mostPopularPosts = posts.filter(post => post.comments.length === maxComments);
        return res.json(mostPopularPosts);
    } else if (type === "latest") {
        const latestPosts = posts
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Sort by newest timestamp
            .slice(0, 5);
        return res.json(latestPosts);
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
