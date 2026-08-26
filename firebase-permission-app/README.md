# Firebase Permission App

## Overview
The Firebase Permission App is a web application that implements a login and registration system with permission management for accessing a downloads area. Users must request access if they are not authorized, and administrators can approve or reject these access requests.

## Features
- User registration and login functionality
- Permission management for accessing the downloads area
- Admin interface for managing access requests
- Responsive design for various devices

## Project Structure
```
firebase-permission-app
├── css
│   └── styles.css          # Styles for the application
├── js
│   ├── firebase-config.js  # Firebase configuration and initialization
│   ├── firebase-auth.js     # Authentication logic and permission management
│   └── admin-requests.js    # Admin functions for managing access requests
├── pages
│   ├── login.html          # Login page
│   ├── cadastro.html       # Registration page
│   ├── downloads.html      # Downloads area (protected)
│   └── admin-requests.html # Admin requests management page
├── index.html              # Main entry point
└── README.md               # Project documentation
```

## Setup Instructions
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd firebase-permission-app
   ```
3. Install the necessary dependencies (if applicable).
4. Configure Firebase by updating the `firebase-config.js` file with your Firebase project settings.
5. Open `index.html` in your web browser to access the application.

## Usage
- Users can register for an account via the registration page (`cadastro.html`).
- After registration, users can log in using the login page (`login.html`).
- Users can request access to the downloads area if they are not authorized.
- Administrators can manage access requests through the admin requests page (`admin-requests.html`).

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any suggestions or improvements.