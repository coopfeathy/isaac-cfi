"use client"

import { motion, type MotionProps } from "framer-motion"
import type React from "react"
import type { ReactNode } from "react"

interface MotionSectionProps extends MotionProps {
  children: ReactNode
  className?: string
}

const MotionSection: React.FC<MotionSectionProps> = ({ children, className, ...motionProps }) => {
  return (
    <motion.section className={className} {...motionProps}>
      {children}
    </motion.section>
  )
}

export default MotionSection

