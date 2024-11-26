import http from "http";
import ws from "websocket"
import redis from "redis";

// Constants
const SERVER_ID = Math.floor(Math.random() * 9000) + 1000;;
const REDIS_CONFIG = {
    port: 6379,
    host: 'redis'
};
const WEBSOCKET_PORT = 3000;
const CHANNEL = 'chat_application';
const WebSocketServer = ws.server


// Global connections array
let connections = [];

// Redis Setup
const createRedisClient = () => {
    return redis.createClient(REDIS_CONFIG);
};

const subscriber = createRedisClient();
const publisher = createRedisClient();

// Redis Subscriber Events
subscriber.on("subscribe", (channel, count) => {
    console.log(`Server ${SERVER_ID} subscribed successfully to ${channel}`);
    publisher.publish(CHANNEL, "Server started");
});

subscriber.on("message", (channel, message) => {
    try {
        console.log(`Server ${SERVER_ID} received message in channel ${channel}: ${message}`);
        broadcastMessage(message);
    } catch (error) {
        console.error("Error broadcasting message:", error);
    }
});

// Subscribe to channel
subscriber.subscribe(CHANNEL);

// WebSocket Server Setup
const httpServer = http.createServer();
const websocket = new WebSocketServer({
    "httpServer": httpServer
});

// Broadcast message to all connections
const broadcastMessage = (message) => {
    connections.forEach(connection => {
        try {
            connection.send(`${SERVER_ID}: ${message}`);
        } catch (error) {
            console.error("Error sending message to client:", error);
        }
    });
};

// Clean up connection
const cleanupConnection = (connection) => {
    const index = connections.indexOf(connection);
    if (index !== -1) {
        connections.splice(index, 1);
        console.log(`Connection cleaned up. Active connections: ${connections.length}`);
    }
};

// Handle graceful shutdown
const cleanup = () => {
    console.log("Cleaning up resources...");
    
    // Close all WebSocket connections
    connections.forEach(connection => {
        connection.close();
    });
    connections = [];

    // Cleanup Redis
    subscriber.unsubscribe();
    subscriber.quit();
    publisher.quit();

    // Close HTTP server
    httpServer.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
    });
};

// WebSocket connection handling
websocket.on("request", request => {
    const connection = request.accept(null, request.origin);
    
    // Connection events
    connection.on("open", () => {
        console.log("New client connected");
    });

    connection.on("close", () => {
        console.log("Client disconnected");
        cleanupConnection(connection);
    });

    connection.on("message", message => {
        if (message.type === 'utf8') {
            console.log(`${SERVER_ID} Received message: ${message.utf8Data}`);
            publisher.publish(CHANNEL, message.utf8Data);
        }
    });

    // Send welcome message
    setTimeout(() => {
        connection.send(`Connected successfully to server ${SERVER_ID}`);
    }, 1000);

    // Add to connections array
    connections.push(connection);
});

// Start server
httpServer.listen(WEBSOCKET_PORT, () => {
    console.log(`WebSocket server is listening on port ${WEBSOCKET_PORT}`);
});

// Handle process termination
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    cleanup();
});