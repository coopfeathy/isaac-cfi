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
  const { signIn, signInWithProvider } = useAuth()
  const [view, setView] = useState<"main" | "email">("main")
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle")
  const [providerLoading, setProviderLoading] = useState<"google" | "apple" | "azure" | null>(null)
  const [message, setMessage] = useState("")
  const [activeTab, setActiveTab] = useState(0)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || view !== "email") return
    const focusTimer = window.setTimeout(() => emailRef.current?.focus(), 120)
    return () => window.clearTimeout(focusTimer)
  }, [open, view])

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

  const showEmailView = () => {
    setStatus("idle")
    setMessage("")
    setProviderLoading(null)
    setView("email")
  }

  const showMainView = () => {
    setView("main")
    setStatus("idle")
    setMessage("")
    setProviderLoading(null)
  }

  const handleProviderSignIn = async (provider: "google" | "apple" | "azure") => {
    setProviderLoading(provider)
    setStatus("idle")
    setMessage("")

    try {
      await signInWithProvider(provider)
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Unable to start sign in. Please try again.")
      setProviderLoading(null)
    }
  }

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
        {view === "email" && (
          <button className="authBack" type="button" onClick={showMainView} aria-label="Back to sign in options">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        <section className="authLeft">
          {view === "main" ? (
            <div className="authView">
              <div className="authLogo">
                <Image src="/merlin-logo.png" alt="Merlin Flight Training" width={128} height={128} priority />
              </div>
              <h1 id="authModalTitle">Welcome to Merlin Flight Training</h1>
              <p className="authSub">Sign in to plan your future for free</p>

              <button
                className="authProviderButton"
                type="button"
                onClick={() => void handleProviderSignIn("google")}
                disabled={providerLoading !== null}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                  <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                </svg>
                {providerLoading === "google" ? "Connecting..." : "Continue with Google"}
              </button>
              <button
                className="authProviderButton"
                type="button"
                onClick={() => void handleProviderSignIn("apple")}
                disabled={providerLoading !== null}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                {providerLoading === "apple" ? "Connecting..." : "Continue with Apple"}
              </button>
              <button
                className="authProviderButton"
                type="button"
                onClick={() => void handleProviderSignIn("azure")}
                disabled={providerLoading !== null}
              >
                <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
                  <path fill="#f25022" d="M1 1h10v10H1z" />
                  <path fill="#7fba00" d="M12 1h10v10H12z" />
                  <path fill="#00a4ef" d="M1 12h10v10H1z" />
                  <path fill="#ffb900" d="M12 12h10v10H12z" />
                </svg>
                {providerLoading === "azure" ? "Connecting..." : "Continue with Microsoft"}
              </button>

              <div className="authDivider">OR</div>

              <button className="authProviderButton" type="button" onClick={showEmailView}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <polyline points="3 7 12 13 21 7" />
                </svg>
                Continue with Email
              </button>

              {message && (
                <div className="authStatus authStatusError" role="status" aria-live="polite">
                  <strong>Could not start sign in</strong>
                  {message}
                </div>
              )}

              <p className="authLegal">
                By continuing, I acknowledge the <a href="/privacy">Privacy Policy</a> and agree to the <a href="/terms">Terms of Use</a>. I also confirm that I am at least 16 years old.
              </p>
            </div>
          ) : (
            <div className="authView">
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
            </div>
          )}
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
        .authBack {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 0;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.45);
          color: #fff;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .authBack:hover {
          background: rgba(0, 0, 0, 0.6);
        }
        .authView {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
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
        .authProviderButton {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 10px;
          padding: 14px 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          background: transparent;
          color: #fff;
          cursor: pointer;
          font: inherit;
          font-size: 15px;
          font-weight: 500;
          transition: border-color 0.18s ease;
        }
        .authProviderButton:hover {
          border-color: #fff;
        }
        .authProviderButton:disabled {
          cursor: wait;
          opacity: 0.7;
        }
        .authProviderButton svg {
          flex-shrink: 0;
        }
        .authDivider {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 14px 0;
          color: rgba(255, 255, 255, 0.42);
          font-size: 12px;
          font-weight: 500;
        }
        .authDivider::before,
        .authDivider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
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
