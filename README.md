🍳 Cooking Assistant

A smart recipe and meal planning web app built using the MERN stack (MongoDB, Express, React, Node.js).
Cooking Assistant helps users find, save, and organize recipes easily — making cooking simpler and more enjoyable.

🚀 Tech Stack
Technology	Purpose
MongoDB	Database for storing user data and recipes
Express.js	Backend framework for APIs
React.js	Frontend library for UI
Node.js	Runtime environment for the backend
Bootstrap / CSS	Styling and responsive design
✨ Features

👨‍🍳 Recipe Search – Find recipes based on ingredients or dish names

📜 Recipe Details – View ingredients, steps, and cooking time

💾 Save Recipes – Add favorites to your personal collection

🍽️ Meal Planner – Organize meals for the week

🔐 User Authentication – Login and register using JWT

📱 Responsive Design – Works perfectly on all devices

📁 Folder Structure
cooking-assistant/
│
├── client/              # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
├── server/              # Express backend
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── server.js
│   └── package.json
│
└── README.md

⚙️ Installation
1. Clone the repository
git clone https://github.com/your-username/cooking-assistant.git

2. Install dependencies
cd cooking-assistant/client
npm install

cd ../server
npm install

3. Set up environment variables

Create a .env file inside the server folder:

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=5000

4. Run the app
# Run frontend and backend together
npm run dev

🌐 Deployment

Frontend: Netlify / Vercel

Backend: Render / Railway / Heroku

Database: MongoDB Atlas

📸 Preview

(Add a screenshot or GIF of your app here)
![Cooking Assistant Screenshot](client/src/assets/preview.png)

🧑‍💻 Author

Ayush Pareek
📍 Thrissur, Kerala
💬 Passionate Full Stack Developer
