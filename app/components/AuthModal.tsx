"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useAuth } from "../contexts/AuthContext"

type AuthModalProps = {
  open: boolean
  onClose: () => void
}

const authTabs = [
  {
    label: "Discovery",
    title: "DISCOVERY FLIGHT",
    chips: ["Beginner Friendly"],
    description: "Real flight instruction. Real logged time. Real takeoff - in our Grumman AA-5A out of Northeast Philadelphia.",
    video: "/talkingvideo_optimized.mp4",
  },
  {
    label: "Private Pilot",
    title: "PRIVATE PILOT",
    chips: ["Online Classes", "Aircraft Provided", "Rigorous Program"],
    description: "A deep understanding and rich skillset to take on the skies. Few Limitations. Endless Possibilities.",
    video: "/engine_optimized.mp4",
  },
  {
    label: "Instrument",
    title: "INSTRUMENT PILOT",
    chips: ["IFR Aircraft", "Simulator Access"],
    description: "Tackle the Clouds. Additional Ratings added to the private pilot skills. Unlock IFR.",
    video: "/discovery_optimized.mp4",
  },
  {
    label: "Commercial",
    title: "COMMERCIAL PILOT",
    chips: ["Career Support", "Partnership Programs", "Resume Building"],
    description: "Make Money. Learn how to provide pilot services, making this skillset into a career. Income Expansion.",
    video: "/DiscoveryFlightLogin_6seconds.mp4",
  },
]

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle")
  const [message, setMessage] = useState("")
  const [activeTab, setActiveTab] = useState(0)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const focusTimer = window.setTimeout(() => emailRef.current?.focus(), 120)
    return () => window.clearTimeout(focusTimer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const timer = window.setInterval(() => {
      setActiveTab((current) => (current + 1) % authTabs.length)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null

  const active = authTabs[activeTab]

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus("loading")
    setMessage("")

    try {
      await signIn(email)
      setStatus("sent")
      setMessage("Open the link from your inbox to continue. If this is your first time, we'll create your account automatically.")
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Unable to send magic link. Please try again.")
    }
  }

  return (
    <div className="authOverlay" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
      <div className="authModal">
        <section className="authLeft">
          <div className="authLogo">
            <Image src="/merlin-logo.png" alt="Merlin Flight Training" width={128} height={128} priority />
          </div>
          <h1 id="authModalTitle">Log in using your email</h1>
          <p className="authSub">We'll send a secure magic link. No password needed.</p>

          <form className="authForm" onSubmit={handleSubmit}>
            <label className="srOnly" htmlFor="magic-link-email">Email address</label>
            <input
              ref={emailRef}
              id="magic-link-email"
              type="email"
              className="authInput"
              placeholder="Email address"
              autoComplete="email"
              required
              value={email}
              disabled={status === "loading"}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button className="authSubmit" type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Sending..." : status === "sent" ? "Send again" : "Send magic link"}
            </button>
          </form>

          {message && (
            <div className={`authStatus ${status === "error" ? "authStatusError" : ""}`} role="status" aria-live="polite">
              <strong>{status === "error" ? "Could not send link" : "Magic link sent"}</strong>
              {message}
            </div>
          )}

          <p className="authNewUser">New here? The magic link creates your account automatically.</p>

          <p className="authLegal">
            By continuing, I acknowledge the <a href="/privacy">Privacy Policy</a> and agree to the <a href="/terms">Terms of Use</a>. I also confirm that I am at least 16 years old.
          </p>
        </section>

        <section className="authRight" aria-hidden="true">
          <div className="authVideoCarousel" style={{ transform: `translateX(-${activeTab * 100}%)` }}>
            {authTabs.map((tab) => (
              <div className="authVideoSlide" key={tab.label}>
                <video className="authVideo" src={tab.video} autoPlay muted loop playsInline preload="auto" />
              </div>
            ))}
          </div>
          <div className="authHero" />
          <div className="authHeroContent">
            <div className="authHeroChip">
              {active.chips.map((chip) => (
                <span className="chipPill" key={chip}>{chip}</span>
              ))}
            </div>
            <h2>{active.title}</h2>
            <p>{active.description}</p>
            <div className="authTabs">
              {authTabs.map((tab, index) => (
                <button
                  type="button"
                  className={`authTab ${index === activeTab ? "active" : ""}`}
                  key={tab.label}
                  onClick={() => setActiveTab(index)}
                >
                  <span className="authTabTrack"><span className="authTabFill" /></span>
                  <span className="authTabLabel">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <button className="authClose" type="button" onClick={onClose} aria-label="Close login modal">x</button>
      </div>

      <style jsx>{`
        .authOverlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(0, 0, 0, 0.78);
          backdrop-filter: blur(8px);
        }
        .authModal {
          position: relative;
          width: min(1200px, 100%);
          height: 760px;
          max-height: 92vh;
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          grid-template-rows: 100%;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 18px;
          background: #161616;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
        }
        .authLeft {
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow-y: auto;
          padding: 56px 48px;
          text-align: center;
          scrollbar-width: none;
        }
        .authLeft::-webkit-scrollbar {
          display: none;
        }
        .authLogo {
          width: 128px;
          margin-bottom: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .authLogo :global(img) {
          width: 100%;
          height: auto;
          filter: invert(1) drop-shadow(0 0 30px rgba(255, 191, 0, 0.15));
        }
        h1 {
          margin: 0 0 10px;
          color: #fff;
          font-size: 32px;
          line-height: 1.12;
          font-weight: 700;
          letter-spacing: 0;
        }
        .authSub {
          margin: 0 0 36px;
          color: rgba(255, 255, 255, 0.56);
          font-size: 15px;
        }
        .authForm {
          width: 100%;
        }
        .srOnly {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .authInput {
          width: 100%;
          margin-bottom: 20px;
          padding: 14px 18px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          outline: none;
          background: transparent;
          color: #fff;
          font: inherit;
          font-size: 15px;
        }
        .authInput::placeholder {
          color: rgba(255, 255, 255, 0.42);
        }
        .authInput:focus {
          border-color: #fff;
        }
        .authInput:disabled {
          opacity: 0.7;
        }
        .authSubmit {
          width: 100%;
          padding: 14px;
          border: 0;
          border-radius: 12px;
          background: #1f1f1f;
          color: #fff;
          font: inherit;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.18s ease;
        }
        .authSubmit:hover:not(:disabled) {
          background: #2a2a2a;
        }
        .authSubmit:disabled {
          cursor: wait;
          opacity: 0.75;
        }
        .authStatus {
          width: 100%;
          margin-top: 16px;
          padding: 14px 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.025);
          color: #fff;
          font-size: 13px;
          line-height: 1.55;
          text-align: left;
        }
        .authStatus strong {
          display: block;
          margin-bottom: 3px;
          color: #fff;
          font-size: 13px;
        }
        .authStatusError {
          border-color: rgba(248, 113, 113, 0.28);
          background: rgba(248, 113, 113, 0.08);
        }
        .authNewUser {
          margin: 20px 0 0;
          color: rgba(255, 255, 255, 0.52);
          font-size: 13px;
        }
        .authLegal {
          max-width: 360px;
          margin: 24px 0 0;
          color: rgba(255, 255, 255, 0.42);
          font-size: 11px;
          line-height: 1.55;
        }
        .authLegal a {
          color: rgba(255, 255, 255, 0.72);
          text-decoration: underline;
        }
        .authRight {
          position: relative;
          align-self: stretch;
          height: calc(100% - 14px);
          min-height: 0;
          margin: 7px;
          overflow: hidden;
          border-radius: 16px;
          background: #0a0a0a;
        }
        .authVideoCarousel {
          position: absolute;
          inset: 0;
          z-index: 0;
          display: flex;
          width: 100%;
          height: 100%;
          overflow: visible;
          border-radius: 16px;
          transition: transform 0.7s cubic-bezier(0.65, 0, 0.35, 1);
          will-change: transform;
        }
        .authVideoSlide {
          position: relative;
          flex: 0 0 100%;
          width: 100%;
          height: 100%;
        }
        .authVideo {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          pointer-events: none;
        }
        .authHero {
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            linear-gradient(180deg, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.85) 100%),
            linear-gradient(0deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0) 50%);
        }
        .authHeroContent {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2;
          padding: 32px 36px 28px;
        }
        .authHeroChip {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 14px;
        }
        .chipPill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 11px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.5);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
        }
        .chipPill::before {
          content: "";
          width: 12px;
          height: 12px;
          flex-shrink: 0;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='20 6 9 17 4 12'/></svg>");
          background-position: center;
          background-repeat: no-repeat;
          background-size: contain;
        }
        .authHeroContent h2 {
          margin: 0 0 10px;
          color: #fff;
          font-size: 38px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: 0;
        }
        .authHeroContent p {
          display: -webkit-box;
          margin: 0 0 22px;
          overflow: hidden;
          color: rgba(255, 255, 255, 0.72);
          font-size: 14px;
          line-height: 1.5;
          white-space: normal;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          line-clamp: 2;
        }
        .authTabs {
          display: flex;
          gap: 14px;
          padding-top: 16px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 13px;
          font-weight: 500;
        }
        .authTab {
          flex: 1;
          min-width: 0;
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
          font: inherit;
        }
        .authTab.active {
          color: #fff;
        }
        .authTabTrack {
          display: block;
          height: 2px;
          margin-bottom: 12px;
          overflow: hidden;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.28);
        }
        .authTabFill {
          display: block;
          width: 0;
          height: 100%;
          border-radius: 2px;
          background: #fff;
        }
        .authTab.active .authTabFill {
          animation: authTabProgress 6s linear forwards;
        }
        .authTabLabel {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .authClose {
          position: absolute;
          top: 27px;
          right: 27px;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.55);
          color: #fff;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
        }
        @keyframes authTabProgress {
          from { width: 0; }
          to { width: 100%; }
        }
        @media (max-width: 1280px) {
          .authModal {
            width: 100%;
            max-width: 640px;
            height: auto;
            max-height: 95vh;
            grid-template-columns: 1fr;
            border-radius: 20px;
          }
          .authRight {
            display: none;
          }
          .authLeft {
            padding: 56px 64px 40px;
          }
          .authClose {
            top: 18px;
            right: 18px;
          }
        }
        @media (max-width: 560px) {
          .authOverlay {
            padding: 16px;
          }
          .authModal {
            max-height: calc(100vh - 32px);
            overflow-y: auto;
            border-radius: 24px;
          }
          .authLeft {
            padding: 48px 32px 32px;
          }
          .authLogo {
            width: 88px;
            margin-bottom: 24px;
          }
          h1 {
            font-size: 26px;
            line-height: 1.2;
          }
          .authSub {
            margin-bottom: 32px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  )
}
