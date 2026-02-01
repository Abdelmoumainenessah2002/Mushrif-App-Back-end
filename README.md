# Mushrif Backend API

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white)

## 📋 Description

Mushrif is a fully integrated web application backend built using Node.js and Express.js. It aims to provide a comprehensive platform for managing projects and teams in a professional and efficient manner. The system offers a wide range of advanced features that help teams collaborate more effectively and complete projects with high efficiency.

## 🏗️ Architecture

The backend follows a scalable MVC (Model-View-Controller) architecture designed to handle a large number of users, routes, and controllers as the application grows.

```
├── app.js                      # Main application entry point
├── package.json               # Project dependencies and scripts
├── API_TESTING.md            # API testing documentation and examples
├── config/                    # Configuration files
│   ├── connectToDB.js        # MongoDB connection setup
│   └── passport.js           # Passport OAuth configuration (Google, Facebook, GitHub)
├── controllers/               # Business logic controllers
│   └── authController.js     # Authentication & user management controllers
├── models/                    # Database models
│   ├── User.js               # User schema, validation, JWT generation
│   └── Notification.js       # Notification system model
├── routes/                    # API route definitions
│   └── authRoute.js          # Authentication & OAuth routes
├── services/                  # Business logic services
│   └── notification.service.js # Notification creation service
└── utils/                     # Utility functions
    ├── generateUID.js         # 8-digit UID generation & username creation
    ├── loginHistoryHelper.js  # Login tracking (IP, browser, device, location)
    └── phoneUtils.js          # International phone number validation & formatting
```

## 🚀 Features

### Authentication & Authorization
- ✅ **Local Registration** - Email/password based registration with comprehensive validation
- ✅ **OAuth Integration** - Google, Facebook, GitHub login with automatic profile creation
- ✅ **JWT Authentication** - Secure token-based authentication
- ✅ **Profile Completion** - OAuth users can complete their profiles with additional info
- ✅ **Password Hashing** - bcryptjs for secure password storage
- ✅ **Input Validation** - Comprehensive request validation using Joi schema validation
- ✅ **Password Complexity** - Strong password requirements with joi-password-complexity

### User Management
- ✅ **Unique User Identification** - 8-digit UID system for secure user identification
- ✅ **Username Generation** - Automatic unique username creation based on first/last name
- ✅ **Phone Number Validation** - International phone number support with country codes
- ✅ **Age Verification** - Minimum age requirement (13+ years)
- ✅ **Gender & DOB Management** - User demographic tracking
- ✅ **Multi-Provider Support** - Seamless integration with multiple authentication providers (local, Google, Facebook, GitHub)

### Login & Security Tracking
- ✅ **Login History Tracking** - Comprehensive session logging with IP addresses
- ✅ **Device Detection** - Browser, OS, and device type detection using ua-parser-js
- ✅ **Geolocation** - IP-based location detection for login tracking
- ✅ **Last Login Info** - Track user's last login time and IP address
- ✅ **User Agent Parsing** - Extract detailed browser and device information

### Notification System
- ✅ **Welcome Notifications** - Automatic welcome message for new users
- ✅ **OAuth Notifications** - Notifications for social login events
- ✅ **Notification Service** - Centralized notification creation and management
- ✅ **Notification Types** - Support for different notification types and priorities
- ✅ **Notification Expiration** - Optional expiration dates for notifications

### Additional Features
- ✅ **Session Management** - Express session configuration for OAuth flows
- ✅ **Proxy Trust** - Proper IP address handling in production environments
- ✅ **CORS Support** - Cross-origin resource sharing enabled
- ✅ **Error Handling** - Async error handling with express-async-handler

## 🛠️ Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime Environment | Latest |
| **Express.js** | Web Framework | ^5.1.0 |
| **MongoDB** | Database | ^8.16.1 |
| **Mongoose** | ODM | ^8.16.1 |
| **JWT** | Authentication | ^9.0.2 |
| **bcryptjs** | Password Hashing | ^3.0.2 |
| **Joi** | Validation | ^17.13.3 |
| **Passport** | OAuth Integration | ^0.7.0 |
| **Multer** | File Upload | ^2.0.1 |
| **PDFKit** | PDF Generation | ^0.17.1 |

## 📱 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Access | Status |
|--------|----------|-------------|--------|--------|
| `POST` | `/register` | Register new user with email/password | Public | ✅ Implemented |
| `POST` | `/login` | Login with email/password | Public | ✅ Implemented |
| `POST` | `/complete-profile/:id` | Complete OAuth user profile | Public | ✅ Implemented |
| `GET` | `/google` | Initiate Google OAuth login | Public | ✅ Implemented |
| `GET` | `/google/callback` | Google OAuth callback (automatic) | Public | ✅ Implemented |
| `GET` | `/facebook` | Initiate Facebook OAuth login | Public | ✅ Implemented |
| `GET` | `/facebook/callback` | Facebook OAuth callback (automatic) | Public | ✅ Implemented |
| `GET` | `/github` | Initiate GitHub OAuth login | Public | ✅ Implemented |
| `GET` | `/github/callback` | GitHub OAuth callback (automatic) | Public | ✅ Implemented |

## 📝 Recent Additions & Updates

### New Services Layer
- **Notification Service** (`services/notification.service.js`) - Centralized notification management with safe creation and validation

### Enhanced User Management
- **Login History System** - Complete tracking of user login activities with:
  - IP address logging and location detection
  - Browser, device, and OS information parsing
  - Geolocation data based on IP
  - Timestamp recording for each login
- **Unique UID Generation** - Automatic 8-digit UID creation with uniqueness validation
- **Smart Username Generation** - Auto-generated unique usernames based on user names with conflict resolution
- **International Phone Support** - Full support for phone numbers with country codes and formatting

### Enhanced Authentication
- **Multiple Provider Support** - Seamless switching between local and OAuth providers
- **Profile Completion Workflow** - OAuth users can enrich their profiles after initial login
- **Comprehensive Validation** - Joi schemas for all authentication endpoints with detailed error messages
- **Password Security** - bcryptjs hashing with complexity validation

### Notification System
- **Welcome Notifications** - Automatic welcome message for newly registered users
- **OAuth Event Notifications** - Automatic notifications for social login events
- **Notification Expiration** - Support for time-limited notifications
- **Priority Levels** - Notifications with different priority levels (low, medium, high)

### API Testing Documentation
- **API_TESTING.md** - Comprehensive API testing guide with curl examples for all endpoints
- Detailed request/response examples
- Error handling documentation

## 📝 API Testing Examples

#### 1. Register New User (Email/Password)
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

**Required Fields:**
- `firstName` (3-50 characters)
- `lastName` (3-50 characters)
- `email` (valid email format)
- `phoneNumber` (structured object)
- `dateOfBirth` (YYYY-MM-DD, age 13-120)
- `gender` (male/female/other)
- `password` (min 8 chars, complex)

#### 2. Login User
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "StrongPassword123!"
  }'
```

#### 3. Complete OAuth Profile
```bash
curl -X POST http://localhost:8000/api/auth/complete-profile/USER_ID \
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

#### 4. OAuth Login URLs
- **Google:** `GET http://localhost:8000/api/auth/google`
- **Facebook:** `GET http://localhost:8000/api/auth/facebook`
- **GitHub:** `GET http://localhost:8000/api/auth/github`

**OAuth Flow:**
1. User visits OAuth URL in browser
2. Redirected to provider (Google/Facebook/GitHub)
3. User authorizes application
4. Redirected to callback URL with JWT token displayed

### 📋 Request/Response Examples

#### Successful Registration Response
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

#### Successful Login Response
```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Error Response Example
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

### 🔐 Authentication

All protected routes require JWT token in the Authorization header:
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 📋 Validation Rules

#### Phone Number Structure
```json
{
  "phoneNumber": {
    "countryCode": "+213",      // Format: +XXX (1-4 digits)
    "localNumber": "661234567", // 6-15 digits
    "fullNumber": "+213661234567" // Complete international format
  }
}
```

#### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

#### Date Validation
- `dateOfBirth`: Must be valid date, user age 13-120 years
- Format: ISO date string (YYYY-MM-DD)

### Future Planned Routes

#### User Management (`/api/users`)
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `DELETE /account` - Delete user account
- `GET /` - Get all users (Admin)
- `GET /:id` - Get user by ID
- `PUT /:id/role` - Update user role (Admin)

#### Project Management (`/api/projects`)
- `GET /` - Get all projects
- `POST /` - Create new project
- `GET /:id` - Get project by ID
- `PUT /:id` - Update project
- `DELETE /:id` - Delete project
- `POST /:id/members` - Add project members
- `DELETE /:id/members/:userId` - Remove project member

#### Team Management (`/api/teams`)
- `GET /` - Get all teams
- `POST /` - Create new team
- `GET /:id` - Get team by ID
- `PUT /:id` - Update team
- `DELETE /:id` - Delete team

#### Notifications (`/api/notifications`)
- `GET /` - Get user notifications
- `POST /` - Create notification
- `PUT /:id/read` - Mark as read
- `DELETE /:id` - Delete notification

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

### Environment Variables
Create a `.env` file in the root directory:

```env
# Database
MONGO_URI=mongodb://localhost:27017/mushrif

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=30d

# Server
PORT=8000
NODE_ENV=development

# Session
SESSION_SECRET=your-session-secret

# OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# URLs
CLIENT_URL=http://localhost:3000
SERVER_URL=http://localhost:8000
```

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Mushrif/Back-end
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   
   # Or if using MongoDB service
   sudo systemctl start mongod
   ```

5. **Run the application**
   ```bash
   # Development mode with nodemon
   npm start
   
   # Production mode
   NODE_ENV=production node app.js
   ```

The server will start on `http://localhost:8000`

## 📊 Database Schema

### User Model
```javascript
{
  username: String,      // Auto-generated unique username
  uid: String,          // 8-digit unique identifier
  firstName: String,    // User's first name
  lastName: String,     // User's last name
  email: String,        // Unique email address
  phoneNumber: {        // Phone number object
    countryCode: String,
    localNumber: String,
    fullNumber: String
  },
  dateOfBirth: Date,    // Date of birth
  gender: String,       // User's gender
  password: String,     // Hashed password
  isAdmin: Boolean,     // Admin privileges
  isVerified: Boolean,  // Email verification status
  isActive: Boolean,    // Account status
  isOAuthUser: Boolean, // OAuth registration flag
  primaryProvider: String, // Primary auth provider
  providers: Array,     // OAuth providers used
  loginHistory: Array,  // Login history tracking
  createdAt: Date,     // Account creation date
  updatedAt: Date      // Last update date
}
```

## 🧪 Testing

### API Testing
Refer to `API_TESTING.md` for detailed API testing examples with curl commands and expected responses.

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: API rate limiting (planned)
- **CORS Protection**: Cross-origin resource sharing configuration
- **SQL Injection Protection**: Mongoose ODM protection
- **XSS Protection**: Input sanitization
- **Login History**: IP and user agent tracking

## 📈 Scalability Considerations

The architecture is designed to handle growth:

### Database Scaling
- **Indexing Strategy**: Optimized database indexes for queries
- **Connection Pooling**: Efficient database connection management
- **Data Partitioning**: Horizontal scaling capabilities (future)

### Application Scaling
- **Modular Architecture**: Easy to add new modules and features
- **Microservices Ready**: Can be split into microservices
- **Load Balancing**: Ready for load balancer integration
- **Caching Strategy**: Redis integration planned for session and data caching

### Performance Optimization
- **Async Operations**: Non-blocking asynchronous operations
- **Middleware Optimization**: Efficient middleware stack
- **Response Compression**: Gzip compression for responses
- **Image Optimization**: Optimized file upload and processing

## � Utilities & Services Documentation

### Login History Helper (`utils/loginHistoryHelper.js`)
Comprehensive tracking of user login activities with detailed device and location information.

**Features:**
- **User Agent Parsing**: Extracts browser name, version, device type, vendor, model, OS name and version
- **IP-based Geolocation**: Determines country and city from IP address using geolocation API
- **Login Entry Creation**: Generates structured login history records with all metadata
- **Device Detection**: Identifies mobile/tablet/desktop devices

**Login History Object Structure:**
```javascript
{
  ipAddress: "192.168.1.1",
  provider: "local", // or "google", "facebook", "github"
  isSuccessful: true,
  loginTime: "2025-07-12T10:30:00.000Z",
  userAgent: "Mozilla/5.0...",
  browser: {
    name: "Chrome",
    version: "120.0.0",
    major: "120"
  },
  device: {
    type: "desktop",
    vendor: "Apple",
    model: "MacBook Pro"
  },
  os: {
    name: "macOS",
    version: "14.5"
  },
  location: {
    country: "United States",
    city: "San Francisco"
  }
}
```

### UID & Username Generation (`utils/generateUID.js`)
Automatic generation of unique user identifiers and usernames.

**Functions:**
- **`generateUID()`** - Generates 8-digit unique user ID
  - Validates uniqueness against database
  - Prevents collisions with retry logic
  - Returns: String (8 digits)

- **`generateUsername(firstName, lastName)`** - Creates unique username
  - Format: `firstname.lastname`
  - Auto-increment suffix if collision exists
  - Cleans special characters and spaces
  - Returns: String

**Example:**
```javascript
const uid = await generateUID(); // "12345678"
const username = await generateUsername("John", "Doe"); // "john.doe"
```

### Phone Number Utilities (`utils/phoneUtils.js`)
International phone number validation and formatting with country code support.

**Features:**
- Country code validation
- Phone number formatting
- Number validation
- Support for multiple phone formats

**Phone Object Structure:**
```javascript
{
  countryCode: "+213",       // 1-4 digits with + prefix
  localNumber: "661234567",  // 6-15 digits
  fullNumber: "+213661234567" // Complete formatted number
}
```

### Notification Service (`services/notification.service.js`)
Centralized service for creating and managing user notifications.

**`createNotification(data)`** - Creates a new notification

**Parameters:**
```javascript
{
  userId: ObjectId,           // Required - User ID
  title: String,             // Required - Notification title
  message: String,           // Required - Notification message
  type: String,              // Optional - 'info'|'success'|'warning'|'error' (default: 'info')
  priority: String,          // Optional - 'low'|'medium'|'high' (default: 'medium')
  expiresAt: Date            // Optional - Notification expiration date
}
```

**Returns:** Promise<Notification> - Created notification document

**Example Usage:**
```javascript
const notification = await createNotification({
  userId: req.user._id,
  title: "Welcome!",
  message: "Welcome to Mushrif! Complete your profile to get started.",
  type: "success",
  priority: "high"
});
```

## 🔧 Configuration Files

### Passport Configuration (`config/passport.js`)
Handles OAuth strategies for Google, Facebook, and GitHub authentication.

**Configured Strategies:**
- Google OAuth 2.0
- Facebook OAuth 2.0
- GitHub OAuth 2.0

**Environment Variables Required:**
```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL

FACEBOOK_APP_ID
FACEBOOK_APP_SECRET
FACEBOOK_CALLBACK_URL

GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_CALLBACK_URL
```

### Database Connection (`config/connectToDB.js`)
Establishes MongoDB connection with Mongoose.

**Configuration:**
- Connection pooling
- Error handling
- Automatic reconnection

**Environment Variables Required:**
```
MONGODB_URI
DB_USER
DB_PASSWORD
```

## �🚧 Roadmap

### Phase 1 (Current)
- [x] User authentication system
- [x] OAuth integration
- [x] Basic user management
- [x] Input validation

### Phase 2 (Next)
- [ ] Project management system
- [ ] Team collaboration features
- [ ] Real-time notifications
- [ ] File upload and management

### Phase 3 (Future)
- [ ] Advanced analytics
- [ ] API rate limiting
- [ ] Advanced security features
- [ ] Mobile app API support

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style
- Use ESLint configuration
- Follow naming conventions
- Add JSDoc comments for functions
- Write tests for new features

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Abde Lmoumain Nessah**
- GitHub: [@AbdelmoumaineNessah2002](https://github.com/Abdelmoumainenessah2002/)
- Email: Abd.nessah02@gmail.com

## 🙏 Acknowledgments

- Express.js team for the excellent web framework
- MongoDB team for the robust database solution
- Passport.js for OAuth integration
- All contributors and open-source projects used

## 📞 Support

If you have any questions or need help, please:
1. Check the [API Testing Guide](API_TESTING.md)
2. Open an issue on GitHub
3. Contact the development team

---

**Built with ❤️ for efficient project and team management**
