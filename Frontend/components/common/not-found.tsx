"use client"

import { motion } from "framer-motion"
import { ArrowRight, Home } from "lucide-react"
import Link from "next/link"

const AnimatedNumber = ({ value }: { value: string }) => {
  const chars = value.split("")
  return (
    <div className="flex gap-4 justify-center">
      {chars.map((char, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.6 }}
          className="text-8xl md:text-9xl font-black"
        >
          <motion.span
            animate={{ y: [0, -10, 0] }}
            transition={{ delay: i * 0.1 + 0.3, duration: 3, repeat: Infinity }}
            className="inline-block"
          >
            {char}
          </motion.span>
        </motion.div>
      ))}
    </div>
  )
}

export function NotFound() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-white text-slate-900 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, #10b981 1px, transparent 1px), linear-gradient(to bottom, #10b981 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Gradient Orbs */}
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-64 -right-64 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, -50, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-64 -left-64 w-96 h-96 bg-emerald-50/60 rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 flex flex-col items-center max-w-2xl px-4"
      >
        {/* 404 Number with Animation */}
        <div className="mb-8 md:mb-12">
          <AnimatedNumber value="404" />
        </div>

        {/* Divider Line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="h-1 w-24 bg-emerald-600 rounded-full mb-8 md:mb-12"
        />

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-3xl md:text-5xl font-bold text-center mb-4 text-slate-900"
        >
          الصفحة غير موجودة
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-slate-600 text-center text-lg md:text-xl mb-12 max-w-md leading-relaxed"
        >
          الصفحة التي تبحث عنها قد تكون مفقودة أو تم حذفها
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <Link
            href="/"
            className="group relative px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5 relative z-10" />
            <span className="relative z-10">العودة للرئيسية</span>
            <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
