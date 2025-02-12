import type { Handler } from "@netlify/functions"
import { google } from "googleapis"

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" }
  }

  try {
    const { date, time, name, email } = JSON.parse(event.body || "{}")

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/calendar"],
    })

    const calendar = google.calendar({ version: "v3", auth })

    const calendarEvent = {
      summary: `Flight Lesson with ${name}`,
      description: `Flight lesson booked by ${name} (${email})`,
      start: {
        dateTime: `${date}T${time}:00`,
        timeZone: "America/New_York", // Adjust this to Isaac's timezone
      },
      end: {
        dateTime: `${date}T${Number.parseInt(time.split(":")[0]) + 2}:${time.split(":")[1]}:00`,
        timeZone: "America/New_York", // Adjust this to Isaac's timezone
      },
    }

    const response = await calendar.events.insert({
      calendarId: "isaacthecfi@gmail.com",
      requestBody: calendarEvent,
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, eventId: response.data.id }),
    }
  } catch (error) {
    console.error("Error in book function:", error)
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: "An error occurred while booking" }),
    }
  }
}

export { handler }

