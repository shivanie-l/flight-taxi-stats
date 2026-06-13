export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">About TarmacTracker</h1>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">The problem</h2>
        <p className="text-slate-300 leading-relaxed">
          US airlines are rated "on time" if a flight departs the gate within 15 minutes of its
          scheduled departure. The clock stops the moment the plane pushes back — not when it
          actually takes off. Airlines have learned to game this metric by pushing back on time and
          then keeping passengers trapped on the tarmac indefinitely.
        </p>
        <p className="text-slate-300 leading-relaxed">
          Meanwhile, airlines pad their published schedules with extra block time to absorb
          expected delays. A flight that boards early, closes doors on time, and then sits for
          40 minutes can still land "on time" or even early. The passenger experience is ignored
          entirely by the official metric.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What we measure</h2>
        <p className="text-slate-300 leading-relaxed">
          We calculate <strong className="text-white">taxi-out time</strong>: the minutes between
          actual gate departure (<code className="bg-slate-800 px-1 rounded">DEP_TIME</code>, when
          the door closes and the plane pushes back) and actual wheels-off time (
          <code className="bg-slate-800 px-1 rounded">WHEELS_OFF</code>). This is the time
          passengers are seated on the plane, unable to use their phone freely, unable to use the
          lavatory, and unable to leave — even if the flight is expected to be delayed.
        </p>
        <p className="text-slate-300 leading-relaxed">
          We report the median, 75th, 90th, and 95th percentiles. The 95th percentile is
          particularly meaningful: 1 in 20 passengers on that airline/airport experiences taxi-out
          times at least that long.
        </p>
        <p className="text-slate-300 leading-relaxed">
          The <strong className="text-white">"on-time trap" rate</strong> is our invented metric:
          the percentage of flights that were recorded as on-time at gate departure but had a
          taxi-out time exceeding 15 minutes. These are flights where the official metric
          looks good but the passenger experience was not.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Data source</h2>
        <p className="text-slate-300 leading-relaxed">
          All data comes from the US Department of Transportation Bureau of Transportation
          Statistics (BTS){' '}
          <a
            href="https://www.transtats.bts.gov/DL_SelectFields.aspx?gnoyr_VQ=FGJ"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            On-Time Performance dataset
          </a>
          , which covers all US carriers reporting under 14 CFR Part 234. Data is released monthly
          with a roughly 2-month lag and updated on this site shortly after each release.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What should change</h2>
        <p className="text-slate-300 leading-relaxed">
          We believe the DOT should supplement or replace its current on-time metric with a
          passenger-centric alternative based on wheels-off time (or better yet, block time
          vs. scheduled block time from the passenger's perspective at the destination gate).
          The current metric creates perverse incentives that harm the very travelers it
          is supposed to protect.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Source code</h2>
        <p className="text-slate-300 leading-relaxed">
          This site is open source. The data pipeline and frontend code are available on GitHub.
          Contributions and corrections welcome.
        </p>
      </section>
    </div>
  )
}
