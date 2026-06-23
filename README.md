# ProductVault

ProductVault is a full-stack, modern web application for managing and browsing a product catalog. The project features a sleek, responsive user interface with real-time search, category filtering, and sorting, powered by a robust Express and PostgreSQL backend.

## Architecture

The project has been refactored into a decoupled architecture with cleanly separated frontend and backend environments.

- **/frontend**: Contains the React application powered by Vite and styled purely with Tailwind CSS v4.
- **/backend**: Contains the Node.js/Express server and PostgreSQL database integration logic.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.
You will also need a PostgreSQL database. Ensure the `DATABASE_URL` is set inside `backend/.env`.

### 1. Backend Setup

Open a terminal and navigate to the backend folder:
```bash
cd backend
```

Install backend dependencies:
```bash
npm install
```

Set up the database schema:
```bash
npm run migrate
```

*(Optional)* Seed the database with sample data:
```bash
npm run seed
```

Start the backend server:
```bash
npm start
```
> The backend server will start on `http://localhost:3000`.

---

### 2. Frontend Setup

Open a new terminal and navigate to the frontend folder:
```bash
cd frontend
```

Install frontend dependencies:
```bash
npm install
```

Start the Vite development server:
```bash
npm run dev
```
> The frontend application will start on `http://localhost:5173`. The Vite config is already set up to proxy `/api` requests automatically to the backend running on port 3000.

---

## 🛠️ Technologies Used

### Frontend
- **React** (v19)
- **Vite** (v8)
- **Tailwind CSS** (v4) for utility-first styling.
- **Lucide React** for modern iconography.

### Backend
- **Node.js** & **Express**
- **PostgreSQL** (`pg` and `pg-format`)
- **CORS** & **dotenv**
