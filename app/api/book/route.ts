import { google } from "googleapis"

export async function POST(req: Request) {
  const { date, time, name, email } = await req.json()

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  })

  const calendar = google.calendar({ version: "v3", auth })

  const event = {
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

  try {
    const response = await calendar.events.insert({
      calendarId: "isaacthecfi@gmail.com",
      requestBody: event,
    })

    return new Response(JSON.stringify({ success: true, eventId: response.data.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in book function:", error)
    return new Response(JSON.stringify({ success: false, error: "An error occurred while booking" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

