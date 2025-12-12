# Yoga Walk 🧘‍♂️🚶‍♀️

**Yoga Walk** is a wellness application that transforms your daily walks into a mindful journey. By combining urban walking routes with curated yoga checkpoints, the app encourages users to pause, stretch, and reflect, blending physical activity with mental clarity.

---

## 📱 Features

* **Interactive Navigation:** Real-time walking routing using OSRM (Open Source Routing Machine).
* **Yoga Checkpoints:** Dynamic markers along your route that prompt specific yoga poses with instructions and benefits.
* **Pose Library:** A searchable collection of yoga poses with animations and "How-to" guides.
* **User Profile:** Track your wellness stats, including total distance walked, poses completed, and current streak.
* **Walk History:** View details of your past journeys, including duration and distance.
* **Custom Settings:** Adjust preferences for difficulty, notifications, and privacy.

---

## 🛠️ Tech Stack

### **Frontend**
* **Framework:** React (Vite)
* **Mapping:** React Leaflet & Leaflet
* **Animations:** Framer Motion
* **Styling:** CSS Modules & Global Styles (Frosted glass UI, Yoga Green theme)

### **Backend**
* **Server:** Flask (Python)
* **Database:** MSSQL (Microsoft SQL Server)
* **Routing API:** OSRM (Open Source Routing Machine)

---

## 🚀 Getting Started

Follow these instructions to get the project up and running on your local machine.

### **Prerequisites**
* Node.js (v16+)
* Python (v3.8+)
* Microsoft SQL Server (Local or Cloud instance)

### **1. Database Setup**
1.  Ensure your SQL Server instance is running.
2.  Execute the setup script to create the necessary tables:
    ```bash
    sqlcmd -S <YOUR_SERVER> -i database/setup.sql
    ```
3.  Seed the database with initial yoga poses and user data:
    ```bash
    cd backend
    python seed_mssql.py
    ```

### **2. Backend Setup**
Navigate to the `backend` directory and start the Flask server.
```bash
cd backend

# Install dependencies (ensure you have virtualenv set up)
pip install flask flask-cors pyodbc

# Run the application
python app.py
The backend API will run on http://localhost:5000 by default.

3. Frontend Setup
Navigate to the frontend directory to install dependencies and launch the UI.

Bash
cd frontend
# Install Node modules
npm install

# Start the development server
npm run dev
The application will launch on http://localhost:5173.


📂 Project Structure
Plaintext

Yoga-Walk/
├── backend/                # Flask API and Data Seeding
│   ├── app.py              # Main application entry point
│   ├── seed_mssql.py       # Database seeder script
│   ├── tables.py           # Database schema definitions
│   └── data.xlsx...        # Source data for poses
│
├── database/
│   └── setup.sql           # SQL scripts for DB initialization
│
├── frontend/               # React Vite Application
│   ├── src/
│   │   ├── components/     # Reusable UI components (Cards, Nav, etc.)
│   │   ├── pages/          # Main Views (Map, Profile, Library, etc.)
│   │   ├── styles/         # CSS files for specific pages
│   │   └── icons/          # SVG assets
│   └── package.json        # Frontend dependencies
│
└── README.md


🎨 Design System
Yoga Walk follows a strict nature-inspired design language:
Primary Color: Yoga Green (#61b329)
UI Elements: Frosted glass cards, pill-shaped buttons, and soft shadows.
Typography: Clean, sans-serif fonts for readability on the go.

🤝 Contributing
Fork the repository.
Create your feature branch (git checkout -b feature/AmazingFeature).
Commiy your changes (git commit -m 'Add some AmazingFeature').
Push to the branch (git push origin feature/AmazingFeature).
Open a Pull Request.

Made with 💚 by Vishnu
