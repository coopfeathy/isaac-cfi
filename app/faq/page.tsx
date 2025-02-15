"use client"

import { motion } from "framer-motion"
import type React from "react"

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => (
  <motion.div
    className="mb-4"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <h3 className="text-xl font-semibold mb-2">{question}</h3>
    <p>{answer}</p>
  </motion.div>
)

const FAQ: React.FC = () => {
  const faqs = [
    {
      question: "How long does a typical flight lesson take?",
      answer:
        "A typical flight lesson lasts about 1-2 hours, including pre-flight briefing and post-flight debriefing.",
    },
    {
      question: "What should I wear for my flight lesson?",
      answer:
        "Wear comfortable clothing and closed-toe shoes. Avoid loose items that could interfere with aircraft controls.",
    },
    {
      question: "How many lessons do I need to become a pilot?",
      answer:
        "The number of lessons varies, but typically it takes 60-75 hours of flight time to earn a private pilot license.",
    },
    {
      question: "What happens if I need to cancel my lesson?",
      answer: "Please give at least 24 hours notice for cancellations. Late cancellations may be subject to a fee.",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h1>
      {faqs.map((faq, index) => (
        <FAQItem key={index} question={faq.question} answer={faq.answer} />
      ))}
    </div>
  )
}

export default FAQ

