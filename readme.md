# 🗳️ Real-Time Polling Application (Backend)

## 📌 Overview

This project is a backend service for a real-time polling system.
It allows users to **create polls**, **vote**, and **view live results**.
The system uses **REST APIs**, **Prisma ORM**, and **Socket.IO** for real-time updates.

---

## ⚙️ Features

* **Authentication:** JWT-based login & register
* **Create Polls:** Add questions with multiple options
* **Vote:** Cast votes securely
* **View Results:** Real-time updates for all connected clients
* **My Polls:** View polls created by a user
* **Socket.IO Integration:** Live result broadcasting

---

## 🏗️ Tech Stack

* **Node.js** – Backend runtime
* **Express.js** – REST API framework
* **Prisma ORM** – Database management
* **PostgreSQL** – Relational database
* **JWT (jsonwebtoken)** – Authentication
* **Socket.IO** – Real-time communication
* **Postman** – API testing

---
## Diagramatic Representation
 ┌─────────────┐           ┌─────────────┐
 │   Client 1  │           │   Client 2  │
 │  (Web/Mobile)│          │  (Web/Mobile)│
 └─────┬───────┘           └─────┬───────┘
       │ REST API requests       │
       │ Vote/Poll fetch/create  │
       ▼                         ▼
   ┌─────────────────────────────┐
   │      Node.js + Express       │
   │ + Prisma ORM (DB layer)     │
   └─────────┬───────────────────┘
             │
             │ Database queries
             ▼
       ┌─────────────┐
       │ PostgreSQL  │
       │  Tables:    │
       │ Users       │
       │ Polls       │
       │ PollOptions │
       │ Votes       │
       └─────────────┘

             ▲
             │ WebSocket events
             │ voteUpdate(pollId, counts)
             │
 ┌───────────┴────────────┐
 │   WebSocket Server     │
 │   (Socket.io)          │
 └───────────┬────────────┘
             │
   Clients subscribed to poll receive real-time updates


## 📂 Project Structure

```
polling-app/
 ├── server.js              # Entry point,Login/Register APIs,Poll creation,voting,results,Socket.
 ├── middleware/
 │    ├── authMiddleware.js # JWT verification
 │    └── errorHandler.js   # Centralized error handling
 ├── prisma/
 │    └── schema.prisma     # Database schema
 ├── test-client.js         # Socket.IO test client
 ├── package.json
 ├── .env                   # Environment variables
 └── README.md
```

---

## 🔑 API Endpoints

### Authentication

* `POST /register` → Register a new user
* `POST /login` → Login and receive JWT token

### Polls

* `POST /polls` → Create a new poll
* `GET /polls/:id` → Get poll details
* `POST /polls/:id/vote` → Cast a vote
* `GET /polls/:id/results` → View poll results
* `GET /mypolls` → View polls created by logged-in user

---

## 🔔 Real-Time Updates

* Users join a poll room via `joinPoll` event
* Updated results broadcasted to all clients in the room

```javascript
socket.emit("joinPoll", pollId);
socket.on("pollUpdate", (data) => {
console.log("Live Results:", data);
});
```

---

## 🧪 Sample API Requests

### Register User

```json
POST /register
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### Login User

```json
POST /login
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Create Poll

```json
POST /polls
Headers: { "Authorization": "Bearer <JWT_TOKEN>" }
{
  "question": "What is your favorite programming language?",
  "options": ["Python", "JavaScript", "C++", "Java"]
}
```

### Vote on Poll

```json
POST /polls/1/vote
Headers: { "Authorization": "Bearer <JWT_TOKEN>" }
{
  "option": "Python"
}
```

### Get Poll Results

```json
GET /polls/1/results
Headers: { "Authorization": "Bearer <JWT_TOKEN>" }
```

---

## ⚙️ Setup & Installation

Clone the repository:

```bash
git clone https://github.com/Revanth1310/polling-app.git
cd polling-app
```

Install dependencies:

```bash
npm install
```

Setup `.env` file:

```
PORT=4000
JWT_SECRET=your_secret
DATABASE_URL="postgresql://username:password@localhost:5432/polling_app"
```

Run Prisma migration:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Start server:

```bash
node server.js
```

---

## ✅ Example Workflow

1. Register/Login → Receive JWT token
2. Create Poll → Add question + options
3. Share Poll ID → Others can vote
4. Watch live vote updates in real-time

---

## 📌 Future Improvements

* Admin dashboard for poll management
* Poll expiry time support
* Multi-choice polls
* Frontend integration with React.js

---

## 📝 Acknowledgement

This project was developed with the assistance of **ChatGPT**, which helped in generating code snippets and structuring the project.

### Run test-client.js To See Hoe Vote Updates In Realtime
```bash
node test-client.js

```
