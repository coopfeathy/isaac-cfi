export default function Loading() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      {/* Merlin logo mark — gold plane icon */}
      <div className="mb-6 animate-pulse">
        <div className="w-14 h-14 bg-golden rounded-xl flex items-center justify-center shadow-lg shadow-golden/20">
          <span className="text-black text-2xl" role="img" aria-label="airplane">✈</span>
        </div>
      </div>

      {/* Animated gold bar */}
      <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-golden rounded-full"
          style={{
            animation: 'merlinSlide 1.2s ease-in-out infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes merlinSlide {
          0% { width: 0%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  )
}
