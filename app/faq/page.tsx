import { motion } from "framer-motion"

const FAQItem = ({q,a} : {q:any, a:any}) => (
  <motion.div
    className="mb-4"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <h3 className="text-xl font-semibold mb-2">{q}</h3>
    <p>{a}</p>
  </motion.div>
)

export default function FAQ() {
  const faqs = [
    {
      q: "How long does a typical flight lesson take?",
      a:
        "A typical flight lesson lasts about 1-2 hours, including pre-flight briefing and post-flight debriefing.",
    },
    {
      q: "What should I wear for my flight lesson?",
      a:
        "Wear comfortable clothing and closed-toe shoes. Avoid loose items that could interfere with aircraft controls.",
    },
    {
      q: "How many lessons do I need to become a pilot?",
      a:
        "The number of lessons varies, but typically it takes 60-75 hours of flight time to earn a private pilot license.",
    },
    {
      q: "What happens if I need to cancel my lesson?",
      a: "Please give at least 24 hours notice for cancellations. Late cancellations may be subject to a fee.",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h1>
      {faqs.map((faq, index) => (
        <FAQItem key={index} q={faq.q} a={faq.a} />
      ))}
    </div>
  )
}