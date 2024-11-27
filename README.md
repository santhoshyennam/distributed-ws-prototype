### step 1: Run docker-compose up
### step 2: open a browser console and type this

let ws = new WebSocket("ws://localhost:8000");

ws.onmessage = message => console.log(`Received: ${message.data}`);

ws.send("Hello!")

### step 3: open multiple console windows to simulate multiple clients

## Flow

<img src="diagram.jpeg" width=600 height=300/>

## Demo

<img src="demo.jpeg" width=400 height=300/>


