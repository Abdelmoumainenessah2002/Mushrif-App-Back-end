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
├── app.js                 # Main application entry point
├── package.json          # Project dependencies and scripts
├── config/               # Configuration files
│   ├── connectToDB.js    # Database connection setup
│   └── passport.js       # Passport OAuth configuration
├── controllers/          # Business logic controllers
│   └── authController.js # Authentication controllers
├── Models/               # Database models
│   ├── User.js          # User model and validation
│   └── Notification.js  # Notification model
├── routes/               # API route definitions
│   └── authRoute.js     # Authentication routes
├── utils/                # Utility functions
│   ├── generateUID.js   # UID and username generation
│   └── phoneUtils.js    # Phone number utilities
└── middleware/           # Custom middleware (future)
    ├── auth.js          # Authentication middleware
    ├── validation.js    # Request validation middleware
    └── errorHandler.js  # Global error handling
```

## 🚀 Features

### Authentication & Authorization
- ✅ **Local Registration** - Email/password based registration
- ✅ **OAuth Integration** - Google, Facebook, GitHub login
- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Profile Completion** - OAuth users can complete their profiles
- ✅ **Password Hashing** - bcrypt for secure password storage
- ✅ **Input Validation** - Comprehensive request validation using Joi

### User Management
- ✅ **Unique User Identification** - 8-digit UID system
- ✅ **Username Generation** - Automatic username creation
- ✅ **Phone Number Validation** - International phone number support
- ✅ **Age Verification** - Minimum age requirement (13+ years)
- ✅ **Login History Tracking** - IP address and user agent logging

### Security Features
- ✅ **Password Complexity** - Strong password requirements
- ✅ **Duplicate Prevention** - Email and phone number uniqueness
- ✅ **Session Management** - Express session for OAuth flows
- ✅ **IP Tracking** - Login history and security monitoring

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

### 📝 API Testing Examples

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

## 🚧 Roadmap

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
