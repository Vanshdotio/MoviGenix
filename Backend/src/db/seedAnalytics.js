const mongoose = require("mongoose");
const User = require("../models/User.model");
const Session = require("../models/Session.model");
const WatchHistory = require("../models/WatchHistory.model");
const SearchHistory = require("../models/SearchHistory.model");
const PlayerEvent = require("../models/PlayerEvent.model");

// Mock Data Helpers
const countries = ["India", "United States", "United Kingdom", "Canada", "Germany", "Japan", "Australia"];
const devices = ["Desktop", "Mobile", "Tablet"];
const osMap = {
  Desktop: ["Windows", "macOS", "Linux"],
  Mobile: ["Android", "iOS"],
  Tablet: ["Android", "iOS"]
};

const movieTitles = [
  { id: "157336", title: "Interstellar", type: "movie", poster: "/gEU2QvEOmihwNu7fgz1jMK3x5v2.jpg" },
  { id: "27205", title: "Inception", type: "movie", poster: "/o0O4Qq0c8P8n3Hs4qjRhgH2Cj6y.jpg" },
  { id: "155", title: "The Dark Knight", type: "movie", poster: "/qJ2tWw3nqRkiwzWwQIhEDYLlhSu.jpg" },
  { id: "299534", title: "Avengers: Endgame", type: "movie", poster: "/or06rgbDZj8mJ27vWg36sY1Yg6B.jpg" }
];

const tvTitles = [
  { id: "95479", title: "The Family Man", type: "tv", poster: "/2Cq9zIqG6aO9v0lYQhH0p3M3y3s.jpg" },
  { id: "80748", title: "Sacred Games", type: "tv", poster: "/69TNS3Z4hX3x90xM5Fk3W48g6rK.jpg" },
  { id: "66732", title: "Stranger Things", type: "tv", poster: "/x2LSRK2Cm7M1ExTBn473uqGZkG5.jpg" }
];

const animeTitles = [
  { id: "1429", title: "Attack on Titan", type: "anime", poster: "/hTe9tws7cQVEaaU96m5hl6NfOWk.jpg" },
  { id: "20982", title: "Demon Slayer", type: "anime", poster: "/f89U3wzqrLMv949SRce483Cl580.jpg" },
  { id: "4604", title: "Naruto", type: "anime", poster: "/o7w5U2a7V9QYc4G1M4Q1W48g6rK.jpg" }
];

const cartoonTitles = [
  { id: "3239", title: "Ben 10", type: "cartoon", poster: "/f5tY5S1O59WQi4G1M4Q1W48g6rK.jpg" },
  { id: "62724", title: "Shinchan", type: "cartoon", poster: "/o7w5U2a7V9QYc4G1M4Q1W48g6rL.jpg" },
  { id: "12345", title: "Doraemon", type: "cartoon", poster: "/o7w5U2a7V9QYc4G1M4Q1W48g6rM.jpg" }
];

const allContent = [...movieTitles, ...tvTitles, ...animeTitles, ...cartoonTitles];

const searchQueries = [
  "Interstellar", "Inception", "Marvel", "Action movies", "Comedy", "Naruto", "Attack on Titan",
  "Shinchan", "Family Man", "Sacred Games", "Christopher Nolan", "Anime hindi", "Cartoons", "Ben 10",
  "Horror", "Avatar", "Batman", "Romantic", "Harry Potter", "Game of Thrones"
];

const firstNames = ["Aarav", "Aanya", "Kabir", "Jessica", "Vansh", "Rahul", "John", "Sarah", "David", "Emma", "Elena", "Rohan", "Ananya", "Dev", "Meera", "Vikram", "Neha", "Arjun", "Pooja", "Sam"];
const lastNames = ["Sharma", "Verma", "Singh", "Smith", "Jones", "Miller", "Taylor", "Patel", "Gupta", "Kumar", "Das", "Mehta", "Brown", "Wilson", "Davis", "Anderson", "Thomas", "White", "Harris", "Martin"];

const seedAnalyticsData = async (force = false) => {
  try {
    // Create a default admin user if none exists
    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash("adminpassword", 10);
      const defaultAdmin = new User({
        name: "System Admin",
        email: "admin@movigenix.com",
        password: hashedPassword,
        role: "admin",
        avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Admin",
        dob: "1990-01-01",
        age: 36,
        isAdult: true,
        safeMode: false,
        hideMature: false
      });
      await defaultAdmin.save();
      console.log("[Analytics Seeder] Created default Admin: admin@movigenix.com / adminpassword");
    }

    // If force is true, we wipe everything to start fresh with real telemetry
    if (force) {
      console.log("[Analytics Seeder] Wiping database for clean live analysis...");
      await Session.deleteMany({});
      await WatchHistory.deleteMany({});
      await SearchHistory.deleteMany({});
      await PlayerEvent.deleteMany({});
      await User.deleteMany({ role: { $ne: "admin" } });
      console.log("[Analytics Seeder] Analytics database cleared successfully.");
    }

    return;
  } catch (error) {
    console.error("[Analytics Seeder] Seeding error:", error.message);
  }
};

module.exports = { seedAnalyticsData };
