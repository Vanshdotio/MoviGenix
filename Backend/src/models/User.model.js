const mongoose = require("mongoose");

const MediaItemSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["movie", "tv", "anime", "cartoon", "web-series"],
  },
  title: {
    type: String,
  },
  name: {
    type: String,
  },
  poster_path: {
    type: String,
  },
  vote_average: {
    type: Number,
    default: 0,
  },
  release_date: {
    type: String,
  },
  first_air_date: {
    type: String,
  }
}, { _id: false });

const MovieContinueWatchingSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  progress: {
    type: Number,
    default: 0,
  },
  duration: {
    type: Number,
    default: 0,
  },
  selectedAudio: {
    type: String,
    default: "",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
}, { _id: false });

const CartoonContinueWatchingSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  season: {
    type: Number,
  },
  episode: {
    type: Number,
  },
  progress: {
    type: Number,
    default: 0,
  },
  duration: {
    type: Number,
    default: 0,
  },
  selectedAudio: {
    type: String,
    default: "",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
}, { _id: false });

const TVContinueWatchingSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  season: {
    type: Number,
    default: 1,
  },
  episode: {
    type: Number,
    default: 1,
  },
  progress: {
    type: Number,
    default: 0,
  },
  duration: {
    type: Number,
    default: 0,
  },
  selectedAudio: {
    type: String,
    default: "",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
}, { _id: false });

const AnimeContinueWatchingSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  season: {
    type: Number,
    default: 1,
  },
  episode: {
    type: Number,
    default: 1,
  },
  progress: {
    type: Number,
    default: 0,
  },
  duration: {
    type: Number,
    default: 0,
  },
  selectedAudio: {
    type: String,
    default: "",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
}, { _id: false });

const WebSeriesContinueWatchingSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  season: {
    type: Number,
    default: 1,
  },
  episode: {
    type: Number,
    default: 1,
  },
  progress: {
    type: Number,
    default: 0,
  },
  duration: {
    type: Number,
    default: 0,
  },
  selectedAudio: {
    type: String,
    default: "",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
}, { _id: false });

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // Optional for Google OAuth users, required for local credentials
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values for normal users
    },
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    suspended: {
      type: Boolean,
      default: false,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    device: {
      type: String,
      default: "Unknown",
    },
    os: {
      type: String,
      default: "Unknown",
    },
    country: {
      type: String,
      default: "Unknown",
    },
    avatar: {
      type: String,
      default: "", // Can be custom URL or set dynamically during login/signup
    },
    dob: {
      type: String,
      default: "",
    },
    age: {
      type: Number,
      default: 0,
    },
    isAdult: {
      type: Boolean,
      default: false,
    },
    safeMode: {
      type: Boolean,
      default: true,
    },
    hideMature: {
      type: Boolean,
      default: true,
    },
    favorites: {
      type: [MediaItemSchema],
      default: [],
    },
    watchlist: {
      movie: {
        type: [MediaItemSchema],
        default: [],
      },
      cartoon: {
        type: [MediaItemSchema],
        default: [],
      },
      tv: {
        type: [MediaItemSchema],
        default: [],
      },
      anime: {
        type: [MediaItemSchema],
        default: [],
      },
      webSeries: {
        type: [MediaItemSchema],
        default: [],
      },
    },
    continueWatching: {
      movie: {
        type: [MovieContinueWatchingSchema],
        default: [],
      },
      cartoon: {
        type: [CartoonContinueWatchingSchema],
        default: [],
      },
      tv: {
        type: [TVContinueWatchingSchema],
        default: [],
      },
      anime: {
        type: [AnimeContinueWatchingSchema],
        default: [],
      },
      webSeries: {
        type: [WebSeriesContinueWatchingSchema],
        default: [],
      },
    },
    preferences: {
      theme: {
        type: String,
        default: "dark",
      },
      language: {
        type: String,
        default: "en",
      },
      audioLanguage: {
        type: String,
        default: "original",
      },
      subtitleLanguage: {
        type: String,
        default: "en",
      },
      autoSelectDub: {
        type: Boolean,
        default: false,
      },
      volume: {
        type: Number,
        default: 0.9,
      },
      audioMode: {
        type: String,
        default: "Voice Boost",
      },
      showAnime: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
