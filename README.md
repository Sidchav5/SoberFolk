# SoberFolk 🚗

**Designated Driver on Demand with Foldable E-Scooters**

SoberFolk is an innovative mobile application that provides on-demand certified drivers who arrive using portable e-scooters. The driver safely transports your vehicle to your desired destination, offering a convenient, eco-friendly, and responsible transportation solution.

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Backend Setup](#backend-setup)
- [Team](#team)
- [License](#license)

## 🎯 About

SoberFolk addresses the need for safe and responsible transportation by connecting users with professional drivers who can drive their vehicles home. Drivers use foldable electric scooters to reach customers quickly, making the service both efficient and environmentally friendly.

### Key Highlights

- 🚴 **Eco-Friendly**: Drivers use foldable e-scooters for pickup
- 🗺️ **Real-Time Tracking**: Integrated Google Maps for navigation
- 💳 **Secure Payments**: Safe cashless transactions
- 🔒 **Certified Drivers**: Professional and verified drivers
- ⚡ **Dynamic Pricing**: Fair pricing based on distance, time, and traffic

## ✨ Features

### For Customers
- Book professional drivers on-demand
- Real-time driver tracking
- Secure authentication and payments
- Ride history and feedback system
- Multiple payment options

### For Drivers
- Accept ride requests in real-time
- Efficient navigation with traffic-aware routes
- Flexible working hours
- Earnings tracking
- Customer feedback system

## 🛠 Technology Stack

### Mobile Application
- **React Native** - Cross-platform mobile development
- **TypeScript** - Type-safe JavaScript
- **React Navigation** - Navigation library for routing
- **React Native Maps** - Map integration
- **AsyncStorage** - Local data persistence

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL** - Database (hosted on Railway)
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### APIs & Services
- **Google Maps API** - Location and navigation services
- **Geohashing** - Efficient location-based driver matching

## 📁 Project Structure

```
SoberFolk/
├── android/                 # Android native code
├── ios/                     # iOS native code
├── src/
│   ├── assets/             # Images and static files
│   ├── backend/            # Backend server code
│   │   ├── server.js       # Express server
│   │   ├── db.js           # Database connection
│   │   └── .env            # Environment variables
│   └── components/         # React Native components
│       ├── OnboardingScreen.tsx
│       ├── HeroSection.tsx
│       ├── LoginScreen.tsx
│       ├── SignupScreen.tsx
│       ├── DriverScreen.tsx
│       ├── ConsumerHome.tsx
│       └── ...
├── __tests__/              # Test files
├── App.tsx                 # Main application component
├── package.json            # Dependencies
└── tsconfig.json          # TypeScript configuration
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (>= 18)
- **npm** or **yarn**
- **React Native CLI**
- **Android Studio** (for Android development)
- **Xcode** (for iOS development - macOS only)
- **CocoaPods** (for iOS dependencies)
- **MySQL** (or access to Railway database)

> **Note**: Make sure you have completed the [React Native Environment Setup](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sidchav5/SoberFolk.git
   cd SoberFolk
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **iOS specific setup** (macOS only)
   
   Install Ruby bundler (first time only):
   ```bash
   bundle install
   ```
   
   Install CocoaPods dependencies:
   ```bash
   cd ios
   bundle exec pod install
   cd ..
   ```

## 📱 Running the Application

### Start Metro Bundler

First, start the Metro bundler:

```bash
npm start
```

### Run on Android

In a new terminal:

```bash
npm run android
```

Or build and run from Android Studio.

### Run on iOS

In a new terminal (macOS only):

```bash
npm run ios
```

Or build and run from Xcode.

> **Tip**: If everything is set up correctly, you should see the app running in your emulator/simulator or on your connected device.

## 🔧 Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd src/backend
   ```

2. **Configure environment variables**
   
   Create or update `.env` file with your configuration:
   ```env
   JWT_SECRET=your_jwt_secret_key
   DB_HOST=your_database_host
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   DB_NAME=SoberFolks
   ```

3. **Start the backend server**
   ```bash
   node server.js
   ```

   The server will run on `http://localhost:5000`

4. **Database Setup**
   
   The application uses MySQL hosted on Railway. Refer to `src/backend/db.txt` for database schema and configuration details.

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run linting:

```bash
npm run lint
```

## 🔄 Development Workflow

1. Make changes to your code
2. Save the file - the app will automatically reload (Fast Refresh)
3. For a full reload:
   - **Android**: Press <kbd>R</kbd> twice or <kbd>Ctrl</kbd>+<kbd>M</kbd> (Windows/Linux) / <kbd>Cmd</kbd>+<kbd>M</kbd> (macOS) → "Reload"
   - **iOS**: Press <kbd>R</kbd> in the simulator

## 👥 Team

**TY-A Group 2 - Artificial Intelligence & Data Science**

- Siddhesh Chavhan
- Rajeshwar
- Shivam
- Anvita
- Raj

**Project Guide**: Prof. Prathmesh Palande (VIT Alumni)

## 📄 License

This project is part of an academic program at VIT.

## 🤝 Contributing

This is an academic project. For any questions or suggestions, please contact the team members.

## 📞 Support

For issues and questions:
- Check the [React Native Troubleshooting Guide](https://reactnative.dev/docs/troubleshooting)
- Review project documentation in `MOM.txt`
- Contact the development team

## 🔗 Important Links

- **GitHub Repository**: [Sidchav5/SoberFolk](https://github.com/Sidchav5/SoberFolk)
- **React Native Documentation**: [reactnative.dev](https://reactnative.dev)
- **Project Guide Repository**: [prathmeshpalande/the-sober-folk](https://github.com/prathmeshpalande/the-sober-folk)

---

Made with ❤️ by Team SoberFolk
