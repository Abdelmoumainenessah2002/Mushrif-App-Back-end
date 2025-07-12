# Mushrif Backend API Testing Guide

This document provides comprehensive testing examples for all implemented API endpoints in the Mushrif backend application.

## 🚀 Base URL
```
Development: http://localhost:8000
Production: https://your-domain.com
```

## 📋 Available Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| `POST` | `/api/auth/register` | Register with email/password | ✅ Implemented |
| `POST` | `/api/auth/login` | Login with email/password | ✅ Implemented |
| `POST` | `/api/auth/complete-profile/:id` | Complete OAuth user profile | ✅ Implemented |
| `GET` | `/api/auth/google` | Initiate Google OAuth | ✅ Implemented |
| `GET` | `/api/auth/facebook` | Initiate Facebook OAuth | ✅ Implemented |
| `GET` | `/api/auth/github` | Initiate GitHub OAuth | ✅ Implemented |

---

## 1. Regular Registration (Email/Password)

### POST /api/auth/register

**Required Fields:**
```json
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john.doe@example.com",
  "phoneNumber": {
    "countryCode": "+213",
    "localNumber": "661234567",
    "fullNumber": "+213661234567"
  },
  "dateOfBirth": "1990-01-15",
  "gender": "male",
  "password": "StrongPassword123!"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com", 
    "phoneNumber": {
      "countryCode": "+213",
      "localNumber": "661234567",
      "fullNumber": "+213661234567"
    },
    "dateOfBirth": "1990-01-15",
    "gender": "male",
    "password": "StrongPassword123!"
  }'
```

```

**Expected Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "username": "johndoe123",
      "uid": "12345678",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phoneNumber": {
        "countryCode": "+213",
        "localNumber": "661234567",
        "fullNumber": "+213661234567"
      },
      "dateOfBirth": "1990-01-15T00:00:00.000Z",
      "gender": "male",
      "isAdmin": false,
      "isVerified": false,
      "isActive": true,
      "createdAt": "2025-07-12T10:30:00.000Z",
      "updatedAt": "2025-07-12T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
```json
// Validation Error (400)
{
  "success": false,
  "message": "\"firstName\" is required"
}

// Duplicate Email (400)
{
  "success": false,
  "message": "User with this email already exists"
}

// Duplicate Phone (400)
{
  "success": false,
  "message": "User with this phone number already exists"
}
```

---

## 2. User Login

### POST /api/auth/login

**Required Fields:**
```json
{
  "email": "john.doe@example.com",
  "password": "StrongPassword123!"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "StrongPassword123!"
  }'
```

**Expected Success Response (200):**
```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
```json
// Invalid Credentials (400)
{
  "success": false,
  "message": "Invalid email or password"
}

// Validation Error (400)
{
  "success": false,
  "message": "\"email\" must be a valid email"
}
```

---

## 3. Complete OAuth Profile

### POST /api/auth/complete-profile/:id

**Required Fields:**
```json
{
  "phoneNumber": {
    "countryCode": "+213",
    "localNumber": "661234567",
    "fullNumber": "+213661234567"
  },
  "dateOfBirth": "1992-05-20",
  "gender": "female"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:8000/api/auth/complete-profile/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": {
      "countryCode": "+213",
      "localNumber": "661234567",
      "fullNumber": "+213661234567"
    },
    "dateOfBirth": "1992-05-20",
    "gender": "female"
  }'
```

**Expected Success Response (200):**
```json
{
  "success": true,
  "message": "Profile completed successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "username": "janesmith456",
      "uid": "87654321",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@example.com",
      "phoneNumber": {
        "countryCode": "+213",
        "localNumber": "661234567",
        "fullNumber": "+213661234567"
      },
      "dateOfBirth": "1992-05-20T00:00:00.000Z",
      "gender": "female",
      "isAdmin": false,
      "isVerified": false,
      "isActive": true,
      "isOAuthUser": true,
      "primaryProvider": "google",
      "createdAt": "2025-07-12T10:30:00.000Z",
      "updatedAt": "2025-07-12T10:35:00.000Z"
    }
  }
}
```

**Error Responses:**
```json
// User Not Found (404)
{
  "success": false,
  "message": "User not found"
}

// Not OAuth User (400)
{
  "success": false,
  "message": "This endpoint is only for OAuth users"
}

// Profile Already Complete (400)
{
  "success": false,
  "message": "Profile is already completed"
}

// Phone Already Exists (400)
{
  "success": false,
  "message": "User with this phone number already exists"
}

// Age Validation (400)
{
  "success": false,
  "message": "You must be at least 13 years old"
}
```

---

## 4. OAuth Authentication

### OAuth Flow Overview
1. User visits OAuth initiation URL in browser
2. Redirected to OAuth provider (Google/Facebook/GitHub)
3. User authorizes the application
4. Provider redirects to callback URL
5. Application displays success page with JWT token

### Google OAuth

**Initiate OAuth:**
```bash
GET http://localhost:8000/api/auth/google
```

**Scopes Requested:** `profile`, `email`

**Callback URL:** `http://localhost:8000/api/auth/google/callback` (automatic)

### Facebook OAuth

**Initiate OAuth:**
```bash
GET http://localhost:8000/api/auth/facebook
```

**Scopes Requested:** `email`

**Callback URL:** `http://localhost:8000/api/auth/facebook/callback` (automatic)

### GitHub OAuth

**Initiate OAuth:**
```bash
GET http://localhost:8000/api/auth/github
```

**Scopes Requested:** `user:email`

**Callback URL:** `http://localhost:8000/api/auth/github/callback` (automatic)

### OAuth Success Response

After successful OAuth authentication, users see an HTML page with:
- Welcome message with user details
- JWT token for API authentication
- Styled success page

**Note:** OAuth users are automatically registered if they don't exist, or logged in if they do exist.

---

## 📋 Validation Rules & Field Requirements

### Phone Number
- **Structure:** Object with `countryCode`, `localNumber`, and `fullNumber`
- **Country Code:** Format `+XXX` (1-4 digits after +)
- **Local Number:** 6-15 digits
- **Full Number:** Complete international format
- **Examples:** 
  ```json
  {
    "countryCode": "+213",
    "localNumber": "661234567", 
    "fullNumber": "+213661234567"
  }
  ```
  ```json
  {
    "countryCode": "+1",
    "localNumber": "2345678901",
    "fullNumber": "+12345678901"
  }
  ```

### Date of Birth
- Must be a valid date in the past
- User must be between 13 and 120 years old
- Format: ISO date string (YYYY-MM-DD)
- Example: `1990-01-15`

### Password (for regular registration)
- Minimum 8 characters
- Must include uppercase, lowercase, number, and special character
- Validated using joi-password-complexity

### Field Requirements Summary

| Field | Email/Password Registration | OAuth Users | Complete Profile |
|-------|----------------------------|-------------|------------------|
| firstName | ✅ Required (3-50 chars) | ✅ Auto from provider | ❌ Already set |
| lastName | ✅ Required (3-50 chars) | ✅ Auto from provider | ❌ Already set |
| email | ✅ Required (valid format) | ✅ Auto from provider | ❌ Already set |
| phoneNumber | ✅ Required (structured object) | ❌ Optional | ✅ Required |
| dateOfBirth | ✅ Required (age 13-120) | ❌ Optional | ✅ Required |
| gender | ✅ Required (male/female/other) | ❌ Optional | ✅ Required |
| password | ✅ Required (complex) | ❌ Not needed | ❌ Not needed |

### Phone Number Structure

The phone number must be provided as a structured object:

```json
{
  "phoneNumber": {
    "countryCode": "+213",      // Format: +XXX (1-4 digits after +)
    "localNumber": "661234567", // 6-15 digits only
    "fullNumber": "+213661234567" // Complete international format
  }
}
```

**Valid Examples:**
```json
// Algeria
{
  "countryCode": "+213",
  "localNumber": "661234567",
  "fullNumber": "+213661234567"
}

// USA
{
  "countryCode": "+1",
  "localNumber": "2345678901",
  "fullNumber": "+12345678901"
}

// UK
{
  "countryCode": "+44",
  "localNumber": "7700123456",
  "fullNumber": "+447700123456"
}
```

### Date of Birth Validation
- **Format:** ISO date string (YYYY-MM-DD)
- **Age Range:** User must be between 13 and 120 years old
- **Examples:** `"1990-01-15"`, `"1995-12-25"`, `"2000-06-30"`

### Password Requirements (Registration Only)
- **Minimum Length:** 8 characters
- **Must Include:**
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one number (0-9)
  - At least one special character (!@#$%^&*()_+)

**Valid Examples:**
- `"StrongPassword123!"`
- `"MySecure@Pass1"`
- `"Complex#Pass2024"`

### Gender Options
- `"male"`
- `"female"`
- `"other"`

---

## 🔒 Authentication

### JWT Token Usage
For protected routes (future implementation), include the JWT token in the Authorization header:

```bash
curl -X GET http://localhost:8000/api/protected-route \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Token Properties
- **Algorithm:** HS256
- **Expiration:** Configurable (default: 30 days)
- **Payload:** Contains user ID, email, and role information

---

## 🧪 Testing Tools

### Using cURL
All examples above use cURL commands that can be run directly in terminal.

### Using Postman
1. Import the API endpoints
2. Set `Content-Type: application/json` header
3. Use the JSON examples provided in the request body
4. For OAuth testing, use browser for the initiation URLs

### Using Browser (OAuth Only)
1. Navigate to OAuth URLs directly in browser:
   - `http://localhost:8000/api/auth/google`
   - `http://localhost:8000/api/auth/facebook`
   - `http://localhost:8000/api/auth/github`
2. Complete OAuth flow
3. Copy JWT token from success page

---

## 🚨 Common Errors

### Validation Errors (400)
```json
{
  "success": false,
  "message": "\"email\" must be a valid email"
}
```

### Duplicate Errors (400)
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

### Authentication Errors (401)
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### Not Found Errors (404)
```json
{
  "success": false,
  "message": "User not found"
}
```

### Server Errors (500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## 📈 Additional Features

### Login History Tracking
Every successful login (including OAuth) automatically tracks:
- IP address
- User agent (browser/device info)
- Login timestamp
- Success status

### Automatic Username Generation
- Generated from first and last name
- Made unique with numerical suffixes if needed
- Format: `firstnamelastname` or `firstnamelastname123`

### Unique User Identification
- Every user gets an 8-digit UID
- Used for internal identification
- Generated automatically and guaranteed unique

---

## 🔧 Environment Setup for Testing

### Required Environment Variables
```env
# Database
MONGO_URI=mongodb://localhost:27017/mushrif

# JWT
JWT_SECRET=your-super-secret-jwt-key

# OAuth (for OAuth testing)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Server Setup
```bash
# Install dependencies
npm install

# Start development server
npm start

# Server runs on http://localhost:8000
```

---

**Note:** This testing guide covers all currently implemented endpoints. As new features are added, this document will be updated accordingly.
