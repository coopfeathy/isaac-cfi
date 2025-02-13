import type { Handler } from "@netlify/functions"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15",
})

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" }
  }

  try {
    const { amount } = JSON.parse(event.body || "{}")

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret }),
    }
  } catch (error) {
    console.error("Error in create-payment-intent function:", error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An error occurred while creating the payment intent" }),
    }
  }
}

export { handler }

