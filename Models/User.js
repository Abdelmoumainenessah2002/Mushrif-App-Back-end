const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const passwordComplexity = require("joi-password-complexity");

const userSchema = new mongoose.Schema({

  username: {
    type: String,
    unique: true,
    required: [true, "Username is required"],
    minlength: [3, "Username must be at least 3 characters long"],
    maxlength: [50, "Username must be at most 50 characters long"],
    trim: true,
  },

  uid: {
    type: String,
    unique: [true, "UID already exists"],
    required: [true, "UID is required"],
    index: true,
    minlength: 10,
    maxlength: 10
  },

  firstName: {
    type: String,
    required: [true, "First name is required"],
    minlength: [2, "First name must be at least 2 characters long"],
    maxlength: [50, "First name must be at most 50 characters long"],
  },

  lastName: {
    type: String,
    required: [true, "Last name is required"],
    minlength: [2, "Last name must be at least 2 characters long"],
    maxlength: [50, "Last name must be at most 50 characters long"],
  },

  email: {
    type: String,
    required: [true, "Email is required"],
    unique: [true, "Email already exists"],
    minlength: [5, "Email must be at least 5 characters long"],
    maxlength: [255, "Email must be at most 255 characters long"],
  },

  phoneNumber: {
    type: {
      countryCode: {
        type: String,
        trim: true,
        validate: {
          validator: function(value) {
            if (!value) return true; // Allow null for OAuth users
            return /^[+]\d{1,4}$/.test(value);
          },
          message: "Country code must be in format +XXX"
        }
      },
      localNumber: {
        type: String,
        trim: true,
      },
      fullNumber: {
        type: String,
        trim: true,
      }
    },
  },

  dateOfBirth: {
    type: Date,
    required: function() {
      // Date of birth only required for local/email-password registration
      return this.primaryProvider === 'local';
    },
    default: null, // Allow null for OAuth users
    validate: {
      validator: function(value) {
        // If no value provided, it's valid (for OAuth users)
        if (!value || value === null) return true;
        // If value provided, validate the age
        const today = new Date();
        const minAge = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
        const maxAge = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
        return value <= minAge && value >= maxAge;
      },
      message: "Age must be between 13 and 120 years"
    }
  },

  gender: {
    type: String,
    enum: ["male", "female", "other", "prefer_not_to_say"],
    required: function() {
      // Gender only required for local/email-password registration
      return this.primaryProvider === 'local';
    },
    default: null // Allow null for OAuth users
  },

  password: {
    type: String,
    required: function () {
      return this.authMethods?.includes("local");
    },
    minlength: [8, "Password must be at least 8 characters long"],
    maxlength: [255, "Password must be at most 255 characters long"],
  },

  // OAuth providers information
  providers: [{
    provider: {
      type: String,
      enum: ["google", "facebook", "github", "local"],
      required: true
    },
    providerId: {
      type: String,
      required: true
    },
    email: String, // Email from provider (might differ from main email)
    displayName: String,
    photoURL: String,
    accessToken: String, // Store encrypted in production
    refreshToken: String, // Store encrypted in production
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  authMethods: {
  type: [String],
  enum: ["local", "google", "facebook", "github"],
  required: true,
},


  // Primary provider used for account creation
  primaryProvider: {
    type: String,
    enum: ["google", "facebook", "github", "local"],
    default: "local"
  },

  bio: {
    type: String,
    minlength: [1, "Bio must be at least 10 characters long"],
    maxlength: [255, "Bio must be at most 255 characters long"],
    default: "No bio yet",
  },

  profilePhoto: {
   type: Object,
   default: {
     url: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
     publicId: null,
   },
 },

 role: {
  type: [String],
  enum: ["user", "support_agent", "admin", "super_admin"],
  default: "user",
  index: true
},

roleMeta: {
  promotedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  promotedAt: {
    type: Date,
    default: null
  }
},

 isVerified: {
  type: Boolean,
  default: false,
 },

 isActive: {
  type: Boolean,
  default: true,
 },

 isDeleted: {
  type: Boolean,
  default: false,
 },

 points: {
  type: Number,
  default: 0,
 },

 socialMedia: [
   {
     platform: {
       type: String,
       enum: ["facebook", "twitter", "linkedin", "instagram", "github", "other"],
     },
     url: {
       type: String,
     }
   }
 ],

 loginHistory: [
    {
      // IP Information
      ipAddress: {
        type: String,
        required: true
      },
      
      // User Agent (raw)
      userAgent: {
        type: String,
        required: false
      },
      
      // Parsed Browser Information
      browser: {
        name: String,        // e.g., "Chrome", "Firefox", "Safari"
        version: String,     // e.g., "120.0.0"
        major: String        // e.g., "120"
      },
      
      // Device Information
      device: {
        type: {
          type: String,      // "desktop", "mobile", "tablet"
        },
        vendor: String,      // e.g., "Apple", "Samsung"
        model: String        // e.g., "iPhone", "Galaxy S21"
      },
      
      // Operating System
      os: {
        name: String,        // e.g., "Windows", "macOS", "iOS", "Android"
        version: String      // e.g., "10", "14.2"
      },
      
      // Location Information
      location: {
        country: String,     // e.g., "United States"
        countryCode: String, // e.g., "US"
        region: String,      // e.g., "California"
        city: String,        // e.g., "San Francisco"
        timezone: String,    // e.g., "America/Los_Angeles"
        latitude: Number,
        longitude: Number
      },
      
      // Login Details
      loginTime: {
        type: Date,
        default: Date.now
      },
      
      isSuccessful: {
        type: Boolean,
        default: true
      },
      
      // OAuth Provider (if applicable)
      provider: {
        type: String,
        enum: ['local', 'google', 'facebook', 'github'],
        default: 'local'
      },
      
      // Additional metadata
      metadata: {
        isTrusted: Boolean,  // Whether this is a known device
        isNewLocation: Boolean
      }
    }
  ],

 // Keep only last 50 login records per user
 lastLoginIP: {
   type: String
 },

 lastLoginTime: {
   type: Date
 },

 hasWelcomeNotification: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true 
});


// Generate JWT token
userSchema.methods.generateAuthToken = function () {
   const payload = {
     id: this._id,
     uid: this.uid,
     username: this.username,
     email: this.email,
     role: this.role,
     isVerified: this.isVerified,
     isActive: this.isActive,
   };
 
   return jwt.sign(payload, process.env.JWT_SECRET, {
     expiresIn: "30d"
   });
};

// Check if user has specific OAuth provider
userSchema.methods.hasProvider = function(providerName) {
  return this.providers.some(p => p.provider === providerName);
};

// Add new OAuth provider to existing user
userSchema.methods.addProvider = function(providerData) {
  // Check if provider already exists
  const existingProvider = this.providers.find(p => 
    p.provider === providerData.provider && p.providerId === providerData.providerId
  );
  
  if (!existingProvider) {
    this.providers.push(providerData);
    this.isOAuthUser = true;
  }
  
  return this;
};

// Get provider data
userSchema.methods.getProvider = function(providerName) {
  return this.providers.find(p => p.provider === providerName);
};

// Validation functions
function validateRegisterUser(obj) {
  const schema = Joi.object({
    firstName: Joi.string().min(2).max(50).trim().required(),
    lastName: Joi.string().min(2).max(50).trim().required(),
    email: Joi.string().email().min(5).max(255).trim().required(),
    phoneNumber: Joi.object({
      countryCode: Joi.string().required(),
      localNumber: Joi.string().required(),
      fullNumber: Joi.string().trim().required()
    }).required(),
    dateOfBirth: Joi.date().max('now').required().messages({
      'date.max': 'Date of birth cannot be in the future'
    }),
    gender: Joi.string().valid("male", "female", "other", "prefer_not_to_say").required(),
    password: passwordComplexity().required()
  });
  return schema.validate(obj);
}

function validateLoginUser(obj) {
  const schema = Joi.object({
    email: Joi.string().email().trim().required(),
    password: Joi.string().min(8).trim().required(),
  });
  return schema.validate(obj);
}

// For OAuth users - no password required, phone, DOB, and gender optional (can be null)
function validateOAuthUser(obj) {
  const schema = Joi.object({
    firstName: Joi.string().min(2).max(50).trim().required(),
    lastName: Joi.string().min(2).max(50).trim().required(),
    email: Joi.string().email().min(5).max(255).trim().required(),
    phoneNumber: Joi.object({
      countryCode: Joi.string().required(),
      localNumber: Joi.string().required(),
      fullNumber: Joi.string().trim().required()
    }).required(),
    dateOfBirth: Joi.date().max('now').allow(null).optional().messages({
      'date.max': 'Date of birth cannot be in the future'
    }),
    gender: Joi.string().valid("male", "female", "other", "prefer_not_to_say").allow(null).optional(),
    // OAuth specific fields
    provider: Joi.string().valid("google", "facebook", "github").required(),
    providerId: Joi.string().required(),
    displayName: Joi.string(),
    photoURL: Joi.string().uri()
  });
  return schema.validate(obj);
}

// validate user profile update
function validateUserProfileUpdate(obj) {
  const schema = Joi.object({
    username: Joi.string().min(3).max(50).trim(),
    firstName: Joi.string().min(2).max(50).trim(),
    lastName: Joi.string().min(2).max(50).trim(),
    bio: Joi.string().min(1).max(255).trim(),
    // Optional fields for profile updates
    socialMedia: Joi.array().items(
      Joi.object({
        platform: Joi.string().valid("facebook", "twitter", "linkedin", "instagram", "github", "other").required(),
        url: Joi.string().required()
      })
    )
  });
  return schema.validate(obj);
}

// validate email
function validateEmail(obj) {
  const schema = Joi.object({
    email: Joi.string().email().trim().required(),
  });
  return schema.validate(obj);
}

// validate new password
function validateNewPassword(obj) {
  const schema = Joi.object({
    password: passwordComplexity().required(),  
  });
  return schema.validate(obj);
}

// validate complete profile for OAuth users
function validateCompleteProfile(obj) {
  const schema = Joi.object({
    phoneNumber: Joi.object({
      countryCode: Joi.string().pattern(/^[+]\d{1,4}$/).required().messages({
        'string.pattern.base': 'Country code must be in format +XXX'
      }),
      localNumber: Joi.string().pattern(/^\d{6,15}$/).required().messages({
        'string.pattern.base': 'Local number must be 6-15 digits'
      }),
      fullNumber: Joi.string().pattern(/^[+]?[1-9]\d{6,18}$/).required().messages({
        'string.pattern.base': 'Please enter a valid phone number'
      })
    }).required(),
    dateOfBirth: Joi.date().max('now').required().messages({
      'date.max': 'Date of birth cannot be in the future'
    }),
    gender: Joi.string().valid("male", "female", "other", "prefer_not_to_say").required()
  });
  return schema.validate(obj);
}

// validate user ID parameter
function validateUserId(obj) {
  const schema = Joi.object({
    id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid user ID format'
    })
  });
  return schema.validate(obj);
}

const User = mongoose.model("User", userSchema);

module.exports = {
  User,
  validateRegisterUser,
  validateLoginUser,
  validateOAuthUser,
  validateUserProfileUpdate,
  validateEmail,
  validateNewPassword,
  validateCompleteProfile,
  validateUserId
};
