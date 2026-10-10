import { lazy, Suspense } from 'react'
import { MotionConfig } from 'framer-motion'
import { Link, NavLink, Route, Routes } from 'react-router-dom'

const Home = lazy(() => import('../pages/Home'))
const Library = lazy(() => import('../pages/Library'))
const Player = lazy(() => import('../pages/Player'))
const Learn = lazy(() => import('../pages/Learn'))
const Train = lazy(() => import('../pages/Train'))
const Import = lazy(() => import('../pages/Import'))

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-2 py-1.5 text-xs sm:px-3 sm:text-sm ${isActive ? 'bg-teal-raised text-cream' : 'text-cream-dim hover:text-cream'}`

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-gold focus:px-3 focus:py-2 focus:text-fret">
        Skip to content
      </a>
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Link to="/" className="font-display text-3xl leading-none">ChordHand</Link>
        <nav aria-label="Main" className="flex max-w-full flex-wrap items-center justify-end gap-0.5 sm:gap-1">
          <NavLink to="/songs" className={link}>Songs</NavLink>
          <NavLink to="/import" className={link}>Import</NavLink>
          <NavLink to="/learn" className={link}>Learn guitar</NavLink>
          <NavLink to="/train" className={link}>Train</NavLink>
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-6 pb-16">
        <Suspense fallback={<p role="status" className="py-24 text-center text-cream-dim">Opening ChordHand…</p>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/songs" element={<Library />} />
            <Route path="/play/:songId" element={<Player />} />
            <Route path="/import" element={<Import />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/train" element={<Train />} />
            <Route path="*" element={<p className="py-24 text-center text-cream-dim">That page doesn’t exist. <Link className="text-gold underline" to="/">Go home</Link></p>} />
          </Routes>
        </Suspense>
      </main>
    </MotionConfig>
  )
}
