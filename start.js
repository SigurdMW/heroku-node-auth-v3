// Import the dependencies we need
const isProduction = process.env.NODE_ENV === "production"
if (!isProduction) {
	console.log("=== Running in DEVELOPMENT mode === ")
	require('dotenv').config()
} else {
	console.log("=== Running in PRODUCTION mode ===")
}
const express = require("express")
const https = require("https")
const {
	setupWebAppAuth,
	generateCertificate,
	VERACITY_API_SCOPES
} = require("@veracity/node-auth")
const session = require("express-session")
const MemoryStore = require("memorystore")(session)

// Create our express instance
const app = express()

const { CLIENT_ID, CLIENT_SECRET, REPLY_URL, PORT } = process.env

// Create the strategy object and configure it
const { refreshTokenMiddleware } = setupWebAppAuth({
	app,
	strategy: { // Fill these in with values from your Application Credential
		clientId: CLIENT_ID,
		clientSecret: CLIENT_SECRET,
		replyUrl: REPLY_URL
	},
	logLevel: "info",
	onLoginComplete: (req, res) => {
		res.redirect("/user")
	},
	session: {
		secret: "ce4dd9d9-cac3-4728-a7d7-d3e6157a06d9", // Replace this with your own secret
		store: new MemoryStore({
			checkPeriod: 86400000 // prune expired entries every 24h
		})
	}
})

const htmlTemplate = (content) => (
	`
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Test auth</title>
		</head>
		<body>
			<a href="/login">Login</a><br>
			<a href="/user">User info</a><br>
			<a href="/refresh">Refresh token</a><br>
			<a href="/logout">Logout</a>
			<hr />
			${content}
		</body>
		</html>
	`
)

app.get("/", (req, res) => {
	res.send(htmlTemplate(""))
})

const isAuthenticated = (req, res, next) => {
	if (req.isAuthenticated()) {
		return next()
	}
	res.status(401).send(htmlTemplate(`<h1>Unauthorized</h1>`))
}

// This endpoint will return our user data so we can inspect it.
app.get("/user", isAuthenticated, (req, res) => {
	res.send(htmlTemplate(JSON.stringify(req.user)))
})

// Create an endpoint where we can refresh the services token.
// By default this will refresh it when it has less than 5 minutes until it expires.
app.get("/refresh", isAuthenticated, refreshTokenMiddleware(), (req, res) => {
	res.send(htmlTemplate(JSON.stringify({
		updated: Date.now(),
		user: req.user
	})))
})

app.use(function (err, req, res, next) {
	console.error(err.stack)
	res.status(500).send(htmlTemplate(JSON.stringify(err.stack)))
})


// if (isProduction) {
	app.listen(PORT || 3000, () => {
		console.log(`Example app listening on port ${PORT}`)
	})
// } else {
// 	// Set up the HTTPS development server
// 	const server = https.createServer({
// 		...generateCertificate() // Generate self-signed certificates for development
// 	}, app)
// 	server.on("error", (error) => { // If an error occurs halt the application
// 		console.error(error)
// 		process.exit(1)
// 	})
// 	server.listen(3000, () => { // Begin listening for connections
// 		console.log("Listening for connections on port 3000")
// 	})
// }
