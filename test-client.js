import { io } from "socket.io-client";

const socket = io("http://localhost:4000");
const POLL_ID = 1;

socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);
  socket.emit("joinPoll", POLL_ID);

  // Simulate voting after 3s
  setTimeout(() => {
    fetch(`http://localhost:4000/polls/${POLL_ID}/vote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer <your_token>"
      },
      body: JSON.stringify({ optionId: 2 })  // adjust optionId
    })
    .then(res => res.json())
    .then(console.log)
    .catch(console.error);
  }, 3000);
});

socket.on("pollUpdated", (data) => {
  console.log("📊 Poll update:", data);
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});
